const { app, ipcMain, screen, globalShortcut, Menu } = require('electron')
const { nativeTheme } = require('electron')
const process = require('process')
const windows = require('./model/windows')
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
      },
      {
        label: "Edit",
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'pasteandmatchstyle' },
          { role: 'delete' },
          { role: 'selectall' }
        ]
      }
    ]
  })
}
const appMenu = Menu.buildFromTemplate(menuTemplate)
Menu.setApplicationMenu(appMenu)

app.on('ready', async () => {
  nativeTheme.themeSource = 'dark'
  await windows.init(screen)
  globalShortcut.register('CommandOrControl+R', () => {
    // 只刷新当前 调试页面
    if (windows.mainWin) {
      const currentPage = windows.router[windows.router.length - 1]
      currentPage.reload()
    }
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
//接受开发 web 端事件
ipcMain.on('nativeEvent', async (event, value) => {
  const { webCode, name, data } = JSON.parse(value)
  const id = data.id
  console.log('nativeEvent')
  console.log(value)
  console.log('====END====')
  windows.nativeCoreFunc(webCode, id, name, data.data)
})