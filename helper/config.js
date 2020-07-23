const prefix = 'lightWeb_'
const BridgeMethods = {
  init: prefix + 'init',
  pageConfig: prefix + 'page_config',
  router: prefix + 'router_config',
  vibrate: prefix + 'vibrate',
  setClipboard: prefix + 'set_clipboard',
  getClipboard: prefix + 'get_clipboard',
}
const RouterActions = {
  'push': 0,
  'pop': 1,
  'replace': 2,
  'setPopExtra': 3,
  'close': 4,
  'restart': 5,
}
module.exports = {
  BridgeMethods,
  RouterActions
}