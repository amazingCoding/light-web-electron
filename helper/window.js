const { createWindow, addAppWindow, addDevWindow, checkHexColor } = require('./index')
const { BridgeMethods, RouterActions } = require('./config')
const { ViewConfig } = require('./model')
let screenWidth = 0
let screenHeight = 0
const PHONE_WIDTH = 500
let DEV_TOOL_WIDTH = 0
class Window {
  appView = null
  devView = null
  floatView = null
  capsulteBtnView = null

  url = null
  currentRouter = 0
  viewConfig = null
  globalName = null
  parent = null

  async init(parent, { currentRouter, url, code }) {
    this.parent = parent
    this.currentRouter = currentRouter
    this.url = url
    const mainWin = parent.mainWin
    this.appView = await addAppWindow(mainWin, null, { x: 0, y: 0, width: 0, height: 0 })
    this.floatView = await addAppWindow(mainWin, 'virtual', { x: 0, y: 0, width: 0, height: 0 })
    this.capsulteBtnView = await addAppWindow(mainWin, 'capsulteBtn', { width: 65, height: 28, x: this.parent.rect.x + this.parent.rect.width - 77, y: this.parent.rect.y + 28 })
    this.devView = await addDevWindow(mainWin, this.appView, parent.devRect)
    // UA 传入 webcode 参数方便通信
    await this.appView.webContents.loadURL(this.url, { userAgent: `webApp/dev/1.0/${code}` })
  }
  changeViewInit(data, id) {
    this.globalName = data.global
    const viewConfig = new ViewConfig(data)
    this.viewConfig = viewConfig
    // 设置 顶部导航栏 和 页面 的尺寸
    const appRect = this.changeNav()
    // 执行回调
    const appInfo = {
      phoneName: 'electron',
      system: 'electronOS',
      systemVersion: '0.1',
      screenWidth: this.parent.rect.width,
      screenHeight: this.parent.rect.height,
      webWidth: this.parent.rect.width,
      webHeight: appRect.height,
      statusBarHeight: 20,
      capsule: {
        width: 65,
        height: 28,
        x: this.parent.rect.width - 12 - 65,
        y: 28
      },
    }
    const routerInfo = {
      maxRouters: this.parent.maxRouterNumber,
      currentPos: this.currentRouter,
    }
    const extra = null
    const res = {
      data: { appInfo, routerInfo, extra },
      state: 1
    }
    this.appView.webContents.executeJavaScript(`window['${this.globalName}'].exec(${id},${JSON.stringify(res)},null)`)
  }
  changeViewInPage(data, id) {
    this.viewConfig.changeInObject(data)
    const appRect = this.changeNav()
    const res = {
      data: { webWidth: this.parent.rect.width, webHeight: appRect.height, },
      state: 1
    }
    this.appView.webContents.executeJavaScript(`window['${this.globalName}'].exec(${id},${JSON.stringify(res)},null)`)
  }
  changeNav() {
    console.log(this.viewConfig)
    const rect = this.parent.rect
    const floatRect = { x: rect.x, y: rect.y, width: rect.width, height: 64 }
    const appRect = { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    if (this.viewConfig.isHideNav != 1) {
      appRect.y += 64
      appRect.height -= 64
    }
    else {
      floatRect.height = 20
    }
    // 导航栏
    this.floatView.webContents.executeJavaScript(`init(${JSON.stringify(this.viewConfig)}, false)`)

    this.floatView.setBounds(floatRect)
    this.appView.setBounds(appRect)
    // console.log(checkHexColor(this.viewConfig.backgroundColor))
    // 背景色
    this.appView.setBackgroundColor(checkHexColor(this.viewConfig.backgroundColor))
    return appRect
  }
  router(data, id) {
    switch (data.action) {
      case RouterActions.push: {

        break
      }
    }
  }
  destroy(mainWin) {
    if (this.appView) mainWin.removeBrowserView(this.appView)
    if (this.devView) mainWin.removeBrowserView(this.devView)
    if (this.floatView) mainWin.removeBrowserView(this.floatView)
    if (this.capsulteBtnView) mainWin.removeBrowserView(this.capsulteBtnView)
    this.devView.destroy()
    this.appView.destroy()
    this.floatView.destroy()
    this.capsulteBtnView.destroy()

    this.devView = null
    this.appView = null
    this.floatView = null
    this.capsulteBtnView = null
  }
}
class Windows {
  startWin = null
  mainWin = null
  maxRouterNumber = null
  url = null
  rect = null
  devRect = null
  currentRouterCode = 0
  currentRouter = 0
  myWindows = {}
  init(screen) {
    screenWidth = screen.getPrimaryDisplay().workAreaSize.width
    screenHeight = screen.getPrimaryDisplay().workAreaSize.height
    DEV_TOOL_WIDTH = screenWidth - PHONE_WIDTH
  }
  async createStartWindow() {
    this.startWin = await createWindow(600, 500)
    this.startWin.on('closed', () => { this.startWin = null })
  }
  // webEvent createMainWindow in start.html
  async createMainWindow({ url, maxRouterNumber }) {
    this.url = url
    this.maxRouterNumber = maxRouterNumber
    this.mainWin = await createWindow(screenWidth, screenHeight, 'index')
    this.mainWin.webContents.executeJavaScript(`main('${this.url}','${this.maxRouterNumber}')`)
    this.startWin.destroy()
    this.mainWin.on('closed', () => {
      this.mainWin = null
    })
    // 方便开发时候刷新
    this.mainWin.webContents.on('did-finish-load', () => {
      this.mainWin.webContents.executeJavaScript(`main('${this.url}','${this.maxRouterNumber}')`)
      this.removeView()
    })
  }
  removeView() {
    for (const key in this.myWindows) {
      if (this.myWindows.hasOwnProperty(key)) this.myWindows[key].destroy(this.mainWin)
    }
    this.myWindows = {}
  }
  // webEvent startDev in index.html
  async startDev(rect, index) {
    this.devRect = {
      x: screenWidth - DEV_TOOL_WIDTH,
      y: 0,
      width: screenWidth,
      height: screenHeight
    }
    this.rect = rect

    const window = new Window()
    const code = new Date().getTime() + ''
    this.myWindows[code] = window
    this.currentRouterCode = code
    this.currentRouter = 0
    window.init(this, { url: this.url, currentRouter: 0, code })
  }
  async createNewDev(name,) {
    const window = new Window()
    const code = new Date().getTime() + ''
    this.myWindows[code] = window

    this.currentRouterCode = code
    this.currentRouter += 1

    window.init(this, { url: this.url, currentRouter: 0, code })
  }
  // webEvent endToStart in index.html
  endToStart() {
    this.createStartWindow()
    this.url = null
    this.maxRouterNumber = null
    this.removeView()
    this.rect = null
    this.devRect = null
    this.mainWin.destroy()
  }
  // nativeEvent in dev html
  async nativeCoreFunc(webCode, id, name, data) {
    const window = this.myWindows[webCode]
    if (!window) return
    switch (name) {
      case BridgeMethods.init: {
        window.changeViewInit(data, id)
        break
      }
      case BridgeMethods.pageConfig: {
        window.changeViewInPage(data, id)
        break
      }
      case BridgeMethods.router: {
        window.router(data, id)
        break
      }
    }
  }
}

module.exports = new Windows()