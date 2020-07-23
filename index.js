const { app, ipcMain, screen, globalShortcut, Menu } = require('electron')
const process = require('process')
const windows = require('./helper/window')
// 顶部菜单
const menuTemplate = []
if (process.platform === 'darwin') {
  menuTemplate.unshift({
    label: app.getName(),
    submenu: [
      {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click() {
          app.quit();
        }
      }
    ]
  })
}
const appMenu = Menu.buildFromTemplate(menuTemplate)
Menu.setApplicationMenu(appMenu)

app.on('ready', async () => {
  windows.init(screen)
  await windows.createStartWindow()
  globalShortcut.register('CommandOrControl+R', () => {
    // 只刷新当前 调试页面
  })
})
// 当全部窗口关闭时退出。
app.on('window-all-closed', () => { app.quit() })
// 接收 web 端事件
ipcMain.on('webEvent', async (event, value) => {
  const { name, id, data } = JSON.parse(value)
  console.log('webEvent')
  console.log(value)
  console.log('====END====')
  if (windows[name]) windows[name](data)
})

ipcMain.on('nativeEvent', async (event, value) => {
  const { webCode, name, data } = JSON.parse(value)
  const id = data.id
  console.log('nativeEvent')
  console.log(value)
  console.log('====END====')
  windows.nativeCoreFunc(webCode, id, name, data.data)
  // try {
  //   const { data, err } = res
  //   // if (windows.mainWin) windows.mainWin.webContents.send('nativeEvent', { id, res: { data: data ? JSON.stringify(data) : '', err } })
  // } catch (error) {
  //   console.log(error)
  // }
})