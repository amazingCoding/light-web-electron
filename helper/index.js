const { BrowserWindow, BrowserView } = require('electron')
const path = require('path')
const { setTimeout } = require('timers')

const createWindow = async (width, height, name = 'start', frame = true, parent = null, hasShadow = true, transparent = false) => {
  const config = {
    width,
    height,
    frame,
    hasShadow,
    transparent,
    show: false,
    minimizable: false,
    maximizable: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      allowRunningInsecureContent: false,
    }
  }
  if (parent) config['parent'] = parent
  let win = new BrowserWindow(config)
  await win.loadFile(path.join(__dirname, `../view/${name}.html`))
  win.show()
  return win
}
const addDevWindow = async (mainWin, win, rect) => {
  const devtools = new BrowserView({})
  if (mainWin) mainWin.addBrowserView(devtools)
  devtools.setBounds(rect)
  win.webContents.setDevToolsWebContents(devtools.webContents)
  win.webContents.openDevTools({ mode: 'detach' })
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(devtools)
    }, 300);
  })
  //return devtools
}
const addAppWindow = async (win, url, rect) => {
  const appView = new BrowserView({
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      blinkFeatures: 'Touch',
      allowRunningInsecureContent: false
    }
  })
  if (win) win.addBrowserView(appView)
  appView.setBounds(rect)
  try {
    if (url) {
      try {
        await appView.webContents.loadFile(path.join(__dirname, `../view/${url}.html`))
      }
      catch (error) {
      }
    }
  } catch (error) {
    console.log(error);
  }
  return appView
}
const isHexColor = (str) => {
  if (str.length === 7 && str.indexOf('#') === 0) {
    const hex = str.substr(str.length - 6)
    if (typeof hex === 'string' && hex.length === 6 && !isNaN(Number('0x' + hex))) return true
  }
  return false
}
const checkHexColor = (str) => {
  if (isHexColor(str)) return str
  return '#ffffff'
}
const vibrate = (isLong, views) => {
  let times = isLong ? 8 : 2
  const rects = []
  for (let index = 0; index < views.length; index++) {
    rects.push(views[index].getBounds())
  }
  const animate = (time, width) => {
    const startTime = new Date().getTime()
    const move = () => {
      const nowTime = new Date().getTime()
      const diff = nowTime - startTime
      const fraction = diff / time
      if (fraction < 1) {
        for (let index = 0; index < rects.length; index++) {
          const rect = rects[index]
          const view = views[index]
          let x = rect.x
          if (fraction < 0.25) { x += Number(parseInt((fraction) * width)) }
          else if (fraction >= 0.25 && fraction < 0.5) { x += Number(parseInt((width / 2 - (fraction - 0.5) * width))) }
          else if (fraction >= 0.5 && fraction < 0.75) { x -= Number(parseInt((fraction) * width)) }
          else if (fraction >= 0.75) { x -= Number(parseInt((width / 2 - (fraction - 0.5) * width))) }
          const newRect = { ...rect }
          newRect.x = x
          view.setBounds(newRect)
        }
        setTimeout(move, Math.min(25, time - diff))
      }
      else {
        if (times > 0) {
          times -= 1
          animate(time, width)
        }
        else {
          for (let index = 0; index < rects.length; index++) {
            views[index].setBounds(rects[index])
          }
        }
      }
    }
    move()
  }
  animate(100, times)
}
module.exports = {
  createWindow,
  addDevWindow,
  addAppWindow,
  checkHexColor,
  isHexColor,
  vibrate
}