const { clipboard } = require('electron')
const { createWindow, addAppWindow, vibrate } = require('../helper/index')
const { BridgeMethods, RouterActions, ZERORECT } = require('../helper/config')
const Page = require('./page')
const { Theme } = require('../helper/model')
class Windows {
  startWin = null
  mainWin = null
  capsulteView = null // capsulte btns view
  headeView = null // nav header view

  maxRouterNumber = null
  root = null
  suffix = ''

  screenWidth = 0
  screenHeight = 0

  router = []
  rect = null
  theme = Theme.light

  async init(screen) {
    this.screenWidth = screen.getPrimaryDisplay().workAreaSize.width
    this.screenHeight = screen.getPrimaryDisplay().workAreaSize.height
    await this.createStartWindow()
  }
  async createStartWindow() {
    this.startWin = await createWindow(700, 500)
    this.startWin.on('closed', () => { this.startWin = null })
  }
  // webEvent createMainWindow in start.html
  async createMainWindow({ url, maxRouterNumber }) {
    const { screenWidth, screenHeight } = this
    // 分析 URL：拆出 root & suffix
    const urlArr = url.split('/')
    const rootArr = urlArr.filter((_, index) => index < urlArr.length - 1)
    this.suffix = urlArr[urlArr.length - 1] === 'index.html' ? '.html' : ''
    this.root = rootArr.join('/')
    this.maxRouterNumber = maxRouterNumber
    this.mainWin = await createWindow(screenWidth, screenHeight, 'index')
    this.mainWin.setBackgroundColor("#020202")
    // 从 start 拿到数据 传递到 main
    this.mainWin.webContents.executeJavaScript(`main('${this.root}', '${this.maxRouterNumber}')`)
    this.startWin.destroy()
    this.mainWin.on('closed', () => {
      this.mainWin = null
    })
  }
  // 创建 webview
  async createApp(name, extra, index = 0) {
    const page = new Page()
    // const suffix = 
    page.init({
      mainWin: this.mainWin,
      extra,
      name,
      url: `${this.root}/${name}${this.suffix}`,
      currentRouter: index,
      devRect: {
        x: 500,
        y: 0,
        width: this.screenWidth - 500,
        height: this.screenHeight
      }
    })
    this.makeHeadViewInTop()
    this.router.push(page)
  }
  // webEvent startDev in index.html 创建第一个页面 
  async startPage(rect) {
    this.rect = rect
    // 创建一个 BrowserView - 虚拟顶部 x = 91 + 12 = 103   / y = y + 20 + (44- 32) / 2
    const myRect = { width: 91, height: 33, x: rect.x + rect.width - 103, y: rect.y + 26 }
    this.capsulteView = await addAppWindow(null, 'capsulteBtn', myRect)
    this.capsulteView.myRect = myRect
    // 创建 header (先不要加入 win 上) & page BrowserView
    this.headeView = await addAppWindow(null, 'virtual', { x: 0, y: 0, width: 0, height: 0 })
    this.createApp('index', null)
    this.mainWin.webContents.executeJavaScript(`changePos(${this.router.length - 1},'index')`)
  }
  // 创建新的页面
  async createNewPage(name, extra) {
    // 删除当前全部的，再加回来
    this.mainWin.removeBrowserView(this.headeView)
    this.mainWin.removeBrowserView(this.capsulteView)
    this.headeView.setBounds(ZERORECT)
    this.capsulteView.setBounds(ZERORECT)
    this.router.map((item) => { if (item.isShow) item.hide(this.mainWin) })
    // 展示当前层
    this.createApp(name, extra, this.router.length)
    this.mainWin.webContents.executeJavaScript(`changePos(${this.router.length - 1},'${name}')`)
  }
  // 删除页面： isToRoot : 是否直接回到第一页
  async removePage(pos, extra) {
    let lastItem = null
    const newRouter = []
    const itemExtra = this.router[this.router.length - 1].popRouterExtra
    // 删除到指定位置
    for (let index = 0; index < this.router.length; index++) {
      const element = this.router[index]
      if (index > pos) { element.destroy(this.mainWin) }
      else {
        if (index === pos) lastItem = element
        newRouter.push(element)
      }
    }
    this.router = newRouter
    this.mainWin.webContents.executeJavaScript(`changePos(${this.router.length - 1},'${lastItem.name}')`)
    this.mainWin.removeBrowserView(this.headeView)
    this.mainWin.removeBrowserView(this.capsulteView)
    // 防止频闪做的延迟
    setTimeout(() => {
      lastItem.show(this.mainWin, extra ? extra : itemExtra)
      this.headeView.webContents.executeJavaScript(`init(${JSON.stringify(lastItem.viewConfig)}, ${lastItem.currentRouter > 0 ? 'true' : 'false'})`)
      this.mainWin.addBrowserView(this.headeView)
      this.mainWin.addBrowserView(this.capsulteView)
      this.headeView.setBounds(lastItem.headRect)
    }, 300)
  }
  // 替换页面，先删除，然后创建
  async replaceNewPage(name, extra, pos) {
    const newRouter = []
    for (let index = 0; index < this.router.length; index++) {
      const element = this.router[index]
      if (index >= pos) { element.destroy(this.mainWin) }
      else { newRouter.push(element) }
    }
    this.router = newRouter
    this.createNewPage(name, extra)
  }
  // webEvent removePageByBackBtn in virtual.html
  removePageByBackBtn() {
    this.removePage(this.router.length - 2, null)
  }
  removeAllPage() {
    this.router.map((item) => {
      item.destroy(this.mainWin)
    })
    this.router = []
  }
  // webEvent cancelEvent in index.html
  endToStart() {
    this.createStartWindow()

    this.root = null
    this.maxRouterNumber = null
    this.removeAllPage()

    this.headeView.destroy()
    this.capsulteView.destroy()
    this.mainWin.destroy()
  }
  // nativeEvent in dev html
  async nativeCoreFunc(webCode, id, name, data) {
    let page = null
    for (let index = 0; index < this.router.length; index++) {
      const element = this.router[index]
      if (element.id === webCode) {
        page = element
        break
      }
    }
    if (!page) return
    switch (name) {
      case BridgeMethods.init: {
        page.changeViewInit(this, { data, id }, this.theme)
        break
      }
      case BridgeMethods.pageConfig: {
        page.changeViewInPage(this, { data, id })
        break
      }
      case BridgeMethods.router: {
        switch (data.action) {
          case RouterActions.push: {
            // push 发起 push 的页面返回回调 & 创建新的页面
            const flag = this.router.length < this.maxRouterNumber
            if (flag) {
              // 如果 root 是 http => 使用 request head 判断是否能访问在进行访问
              // 如果 root 是 file => 判断文件是否存在进行访问
              this.createNewPage(data.name, data.extra)
            }
            else {
              page.pushCallBack(flag, id)
            }
            break
          }
          case RouterActions.pop: {
            // isToRoot 为 true 的话，优先 isToRoot
            // pos 从 0 开始算， 为 0 的时候就等于 isToRoot
            // 比大于，等于 当前 page 位置的话，返回报错
            // 不设置的时候，相当于 当前 page pos - 1

            // 首页不需要回退
            if (this.router.length === 1) {
              page.popCallBack('it is the first page', id)
              return
            }
            let pos = 0
            if (data.isToRoot) { pos = 0 }
            else {
              pos = data.pos === undefined ? this.router.length - 2 : data.pos
              if (pos >= this.router.length - 1) {
                page.popCallBack('it is error pos to pop', id)
                return
              }
            }
            this.removePage(pos, data.extra)
            break
          }
          case RouterActions.replace: {
            // pos 从 0 开始算
            // 比 当前 page 位置大的话，返回报错
            // 不设置的时候，相当于 当前 page pos

            // 如果 root 是 http => 使用 request head 判断是否能访问在进行访问
            // 如果 root 是 file => 判断文件是否存在进行访问
            let pos = data.pos === undefined ? this.router.length - 1 : data.pos
            if (pos > this.router.length - 1) {
              page.popCallBack('it is error pos to replace', id)
              return
            }
            this.replaceNewPage(data.name, data.extra, pos)
            break
          }
          case RouterActions.setPopExtra: {
            const flag = this.router.length !== 1
            page.setPopExtra(flag, id, data.extra)
            break
          }
          case RouterActions.restart: {
            // 关闭所有的 page,执行 startPage
            this.removeAllPage()
            await this.startPage(this.rect)
            break
          }
        }
        break
      }
      case BridgeMethods.vibrate: {
        // 只有在当前的 page 才执行
        const arr = [page.appView, this.capsulteView]
        if (!page.viewConfig.isHideNav) {
          arr.push(this.headeView)
        }
        vibrate(data.isLong === 1, arr)
        const res = { data: null, state: 0 }
        page.callBack(id, res, null)
        break
      }
      case BridgeMethods.getClipboard: {
        const text = clipboard.readText()
        const res = { data: { text }, state: 0 }
        page.callBack(id, res, null)
        break
      }
      case BridgeMethods.setClipboard: {
        console.log(data);
        const text = data.text ? data.text : ''
        clipboard.writeText(text)
        const res = { data: null, state: 0 }
        page.callBack(id, res, null)
        break
      }
    }
  }
  // webEvent in index.html
  changeTheme() {
    this.theme = this.theme === Theme.light ? Theme.dark : Theme.light
    this.router.map((item) => {
      item.changeTheme(this.theme)
    })
  }
  // webEvent in index.html
  changeAppStaus(data) {
    // active ｜ background status 只对 最顶层的 page 生效
    const currentPage = this.router[this.router.length - 1]
    currentPage.changeAppStaus(data.status)
  }
  // headwin change 
  changeHeaderWin(viewConfig, backFlag, headRect, viewID) {
    // 判断调用该函数的是否是 一个 win 
    const current = this.router[this.router.length - 1]
    if (current.id !== viewID) return
    if (!this.headeView) return
    this.headeView.webContents.executeJavaScript(`init(${JSON.stringify(viewConfig)}, ${backFlag})`)
    this.headeView.setBounds(headRect)
  }
  makeHeadViewInTop() {
    // 确保 headeView,capsulteView 没有加入到 mainWin
    const views = this.mainWin.getBrowserViews()
    for (let index = 0; index < views.length; index++) {
      const element = views[index]
      if (this.headeView.id === element.id || this.capsulteView.id === element.id) this.mainWin.removeBrowserView(element)
    }
    // 把 headeView,capsulteView 加入 mainWin
    this.mainWin.addBrowserView(this.headeView)
    this.mainWin.addBrowserView(this.capsulteView)
    this.capsulteView.setBounds(this.capsulteView.myRect)
  }
}
module.exports = new Windows()