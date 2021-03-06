import {
  initWebview,
  createWebview
} from './webview'

import {
  navigateFinish
} from './navigator'

import tabBar from '../framework/tab-bar'

import {
  createPage
} from '../../page-factory'

const pages = []

export function getCurrentPages (returnAll) {
  return returnAll ? pages.slice(0) : pages.filter(page => {
    return !page.$page.meta.isTabBar || page.$page.meta.visible
  })
}

/**
 * 首页需要主动registerPage，二级页面路由跳转时registerPage
 */
export function registerPage ({
  url,
  path,
  query,
  openType,
  webview
}) {
  const routeOptions = JSON.parse(JSON.stringify(__uniRoutes.find(route => route.path === path)))

  if (
    openType === 'reLaunch' ||
    (
      !__uniConfig.realEntryPagePath &&
      pages.length === 0
    )
  ) {
    routeOptions.meta.isQuit = true
  } else if (!routeOptions.meta.isTabBar) {
    routeOptions.meta.isQuit = false
  }

  if (!webview) {
    webview = createWebview(path, routeOptions)
  } else {
    webview = plus.webview.getWebviewById(webview.id)
    webview.nvue = routeOptions.meta.isNVue
  }

  if (routeOptions.meta.isTabBar) {
    routeOptions.meta.visible = true
  }

  if (routeOptions.meta.isTabBar && webview.id !== '1') {
    tabBar.append(webview)
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[uni-app] registerPage`, path, webview.id)
  }

  initWebview(webview, routeOptions, url)

  const route = path.slice(1)

  webview.__uniapp_route = route

  const pageInstance = {
    route,
    options: Object.assign({}, query || {}),
    $getAppWebview () {
      // 重要，不能直接返回 webview 对象，因为 plus 可能会被二次替换，返回的 webview 对象内部的 plus 不正确
      // 导致 webview.getStyle 等逻辑出错(旧的 webview 内部 plus 被释放)
      return plus.webview.getWebviewById(webview.id)
    },
    $page: {
      id: parseInt(webview.id),
      meta: routeOptions.meta,
      path,
      route,
      openType
    },
    $remove () {
      const index = pages.findIndex(page => page === this)
      if (index !== -1) {
        pages.splice(index, 1)
        if (!webview.nvue) {
          this.$vm.$destroy()
        }
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[uni-app] removePage`, path, webview.id)
        }
      }
    },
    // 兼容小程序框架
    selectComponent (selector) {
      return this.$vm.selectComponent(selector)
    },
    selectAllComponents (selector) {
      return this.$vm.selectAllComponents(selector)
    }
  }

  pages.push(pageInstance)

  // 首页是 nvue 时，在 registerPage 时，执行路由堆栈
  if (webview.id === '1' && webview.nvue) {
    __uniConfig.onReady(function () {
      navigateFinish(webview)
    })
  }

  if (__PLATFORM__ === 'app-plus') {
    if (!webview.nvue) {
      const pageId = webview.id
      try {
        createPage(route, pageId, query, pageInstance).$mount()
      } catch (e) {
        console.error(e)
      }
    }
  }

  return webview
}
