const { ViewConfig, Theme } = require('../helper/model')
const { addAppWindow, addDevWindow, checkHexColor } = require('../helper/index')
const { BridgeEvents, ZERORECT } = require('../helper/config')
const THEMES = ['light', 'dark']
class Page {
  currentRouter = null
  id = null
  name = null
  appView = null
  devView = null

  globalName = null
  viewConfig = null
  preRouterExtra = null
  popRouterExtra = null

  currentTheme = null

  devViewRect = null
  appViewRect = null
  headRect = null

  isShow = false

  isInit = false

  async init({ mainWin, currentRouter, url, extra, devRect, name }) {
    this.currentRouter = currentRouter
    this.preRouterExtra = extra
    this.name = name
    this.devViewRect = devRect
    this.appView = await addAppWindow(mainWin, null, ZERORECT)
    this.id = new Date().getTime() + ''
    // 优先 生成 devView，再去 Load URL ，这样才能获取所有 dev network 信息.
    // electron 的一个 bug ，如果 appView link 去local URL 之后在 redirct 回来，无法设置 view background
    await this.appView.webContents.loadURL(url)
    this.devView = await addDevWindow(mainWin, this.appView, { x: 0, y: 0, width: 1, height: 1 })
    await this.appView.webContents.loadURL(url, { userAgent: `webApp/dev/1.0/${this.id}` })
  }
  async changeViewInit(app, { data, id }, theme) {
    this.globalName = data.global
    const viewConfig = new ViewConfig(data)
    this.viewConfig = viewConfig
    this.currentTheme = this.viewConfig.theme === Theme.auto ? theme : this.viewConfig.theme
    // 设置 顶部导航栏 和 页面 的尺寸
    this.changeNav(app)
    const appRect = this.appViewRect
    // 执行回调
    const appInfo = {
      phoneName: 'electron',
      system: 'electronOS',
      systemVersion: '0.1',
      screenWidth: app.rect.width,
      screenHeight: app.rect.height,
      webWidth: app.rect.width,
      webHeight: appRect.height,
      statusBarHeight: 20,
      capsule: { width: 91, height: 33, x: app.rect.width - 12 - 91, y: 26 },
    }
    const routerInfo = {
      maxRouters: app.maxRouterNumber,
      currentPos: this.currentRouter,
    }
    const extra = this.preRouterExtra ? this.preRouterExtra : null
    // 用完就不再需要了
    this.preRouterExtra = null
    const res = {
      data: {
        appInfo,
        routerInfo,
        extra: extra ? JSON.stringify(extra) : null,
        currentTheme: this.currentTheme
      },
      state: 0
    }
    this.callBack(id, res, null)
    // 刷新当前开发页面的时候reload，不再执行这一步
    if (!this.isInit) {
      this.appView.webContents.debugger.attach('1.3')
      this.appView.webContents.debugger.sendCommand('Emulation.setEmitTouchEventsForMouse', {
        enabled: true,
        configuration: 'mobile',
      })
      this.appView.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', {
        features: [{
          name: 'prefers-color-scheme',
          value: THEMES[this.currentTheme],
        }]
      })
      this.isInit = true
    }
    this.show(app.mainWin, null)
  }
  changeViewInPage(app, { data, id }) {
    const themeConfig = this.viewConfig.theme
    this.viewConfig.changeInObject(data)
    this.changeNav(app)
    const appRect = this.appViewRect
    const currentRect = this.appView.getBounds()
    if (currentRect.height != appRect.height) this.appView.setBounds(this.appViewRect)
    // pageConfg is Change ? 
    if (themeConfig !== this.viewConfig.theme) {
      this.currentTheme = this.viewConfig.theme === Theme.auto ? app.theme : this.viewConfig.theme
      this.appView.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', {
        features: [{
          name: 'prefers-color-scheme',
          value: THEMES[this.currentTheme],
        }]
      })
    }
    const res = {
      data: { webWidth: appRect.width, webHeight: appRect.height, currentTheme: this.currentTheme },
      state: 0
    }
    this.callBack(id, res, null)
  }
  changeNav(app) {
    const rect = app.rect
    const headRect = { x: rect.x, y: rect.y, width: rect.width, height: 64 }
    const appRect = { ...app.rect }
    if (this.viewConfig.isHideNav != 1) {
      appRect.y += headRect.height
      appRect.height -= headRect.height
    }
    else {
      headRect.height = 20
    }
    // // 背景色
    this.appView.setBackgroundColor(checkHexColor(this.viewConfig.backgroundColor))
    // 导航栏
    app.changeHeaderWin(this.viewConfig, this.currentRouter > 0 ? 'true' : 'false', headRect, this.id)
    // 记录 rect
    this.headRect = headRect
    this.appViewRect = appRect
  }
  hide(win) {
    this.devView.setBounds(ZERORECT)
    this.appView.setBounds(ZERORECT)
    win.removeBrowserView(this.devView)
    win.removeBrowserView(this.appView)
    this.isShow = false
    // web hide 通知
    const res = { data: null, state: 0 }
    this.pub(BridgeEvents.hide, res)
  }
  show(win, extra) {
    win.addBrowserView(this.appView)
    win.addBrowserView(this.devView)
    this.devView.setBounds(this.devViewRect)
    this.appView.setBounds(this.appViewRect)
    this.isShow = true
    // show show 通知
    const res = { data: extra ? JSON.stringify(extra) : null, state: 0 }
    this.pub(BridgeEvents.show, res)
  }
  destroy(mainWin) {
    if (this.devView) {
      mainWin.removeBrowserView(this.devView)
      this.devView.destroy()
    }
    if (this.appView) {
      mainWin.removeBrowserView(this.appView)
      this.appView.destroy()
    }
  }
  // push 回调
  pushCallBack(flag, id) {
    let res = { data: true, state: 0 }
    let err = null
    if (!flag) {
      res = null
      err = { errorMsg: 'max router limit', state: -1 }
    }
    this.callBack(id, res, err)
  }
  popCallBack(flag, id) {
    // pop 只有失败才有回调，成功的话已经销毁了
    if (flag === '') return
    const err = { errorMsg: flag, state: -1 }
    this.callBack(id, null, err)
  }
  setPopExtra(flag, id, extra) {
    // 首页不需要设置，设置到 popRouterExtra 去，
    // 在 window 的 removePageByBackBtn 拿出来使用
    // 在 pop 时候，可以对照一下是否存在 pop  extra 没有的话也能取出使用
    let res = { data: true, state: 0 }
    let err = null
    if (!flag) {
      res = null
      err = { errorMsg: 'first page can not set popRouterExtra', state: -1 }
    }
    this.callBack(id, res, err)
    if (flag) this.popRouterExtra = extra
  }
  callBack(id, success = null, fail = null) {
    const res = success ? JSON.stringify(success) : 'null'
    const err = fail ? JSON.stringify(fail) : 'null'
    this.appView.webContents.executeJavaScript(`window['${this.globalName}'].exec(${id},${res},${err})`)
  }
  pub(name, res) {
    this.appView.webContents.executeJavaScript(`window['${this.globalName}'].pub('${name}',${JSON.stringify(res)})`)
  }
  changeTheme(theme) {
    if (this.viewConfig.theme !== Theme.auto) return
    this.appView.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', {
      features: [{
        name: 'prefers-color-scheme',
        value: THEMES[theme]
      }]
    })
    // 发送 pub 到前端
    const res = { data: { theme }, state: 0 }
    this.pub(BridgeEvents.sceneMode, res)
    this.appView.webContents.executeJavaScript(`window['${this.globalName}'].currentTheme = ${theme}`)

  }
  changeAppStaus(type) {
    const res = { data: null, state: 0 }
    this.pub(type === 1 ? BridgeEvents.active : BridgeEvents.backGround, res)
  }
  reload() {
    if (this.appView) this.appView.webContents.reload()
  }
}
module.exports = Page