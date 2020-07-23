const ipcRenderer = require('electron').ipcRenderer
class NativeEvent {
  callbacks = {}
  callbackID = 0
  constructor() {
    ipcRenderer.on("nativeEvent", (event, value) => {
      const { id, res } = value
      if (this.callbacks[id]) {
        const { data, err } = res
        const resData = data.length > 0 ? JSON.parse(data) : null
        this.callbacks[id](id, { data: resData, err })
      }
    })

  }
  sent(opt, success, fail) {
    if (opt && opt.name) {
      this.callbackID += 1
      const cid = this.callbackID.toString()
      this.callbacks[cid] = (id, res) => {
        const { data, err } = res
        if (!err && success) success(data)
        if (err && fail) fail(err)
        if (this.callbacks[id]) {
          const callbacks = {}
          for (const key in this.callbacks) {
            if (this.callbacks.hasOwnProperty(key)) {
              if (key !== id) callbacks[key] = this.callbacks[key]
            }
          }
          this.callbacks = callbacks
        }
      }
      const data = { ...opt, id: this.callbackID }
      ipcRenderer.send("webEvent", JSON.stringify(data))
    }
  }
}
const nativeEvent = new NativeEvent()