const { BrowserWindow, BrowserView } = require('electron')
const path = require('path')

const createWindow = async (width, height, name = 'start') => {
  let win = new BrowserWindow({
    width,
    height,
    minimizable: false,
    maximizable: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      allowRunningInsecureContent: false,
    }
  })
  await win.loadFile(path.join(__dirname, `../view/${name}.html`))
  return win
}

const addDevWindow = async (mainWin, win, rect) => {
  const devtools = new BrowserView({
    transparent: true
  })
  devtools.webContents.transparent = true
  devtools.webContents.backgroundColor = "#000000"
  mainWin.addBrowserView(devtools)
  devtools.setBounds(rect)
  win.webContents.setDevToolsWebContents(devtools.webContents)
  win.webContents.openDevTools({ mode: 'detach' })
  return devtools
}
const addAppWindow = async (win, url, rect) => {
  let appView = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      allowRunningInsecureContent: false
    }
  })
  win.addBrowserView(appView)
  appView.setBounds(rect)
  try {
    if (url) {
      await appView.webContents.loadFile(path.join(__dirname, `../view/${url}.html`))
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
module.exports = {
  createWindow,
  addDevWindow,
  addAppWindow,
  checkHexColor,
  isHexColor
}