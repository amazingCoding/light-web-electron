const prefix = 'lightWeb_'
const BridgeMethods = {
  init: prefix + 'init',
  pageConfig: prefix + 'page_config',
  router: prefix + 'router_config',
  vibrate: prefix + 'vibrate',
  setClipboard: prefix + 'set_clipboard',
  getClipboard: prefix + 'get_clipboard',
}
const BridgeEvents = {
  'active': prefix + 'appActive',
  'backGround': prefix + 'appBackGround',
  'show': prefix + 'viewShow',
  'hide': prefix + 'viewHide',
  'sceneMode': prefix + 'sceneMode'
}
const RouterActions = {
  'push': 0,
  'pop': 1,
  'replace': 2,
  'setPopExtra': 3,
  'restart': 4,
}
const ZERORECT = { x: 0, y: 0, width: 0, height: 0 }
module.exports = {
  BridgeMethods,
  BridgeEvents,
  RouterActions,
  ZERORECT
}