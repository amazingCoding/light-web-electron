const { isHexColor } = require('./index')
class ViewConfig {
  isHideNav = 0
  statusStyle = 0
  title = ''
  titleColor = '#ffffff'
  navBackgroundColor = '#000000'
  backgroundColor = '#f1f1f1'
  bounces = 0
  showCapsule = 1
  constructor(obj) {
    for (const key in obj) { this.checkUndefValue(obj, key) }
  }
  checkUndefValue(obj, key) {
    if (obj.hasOwnProperty(key) && this.hasOwnProperty(key)) {
      const val = obj[key]
      if (val !== undefined) this[key] = val
    }
  }
  changeInObject(obj) {
    const arr = []
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && this.hasOwnProperty(key)) {
        if (obj[key] !== this[key]) {
          if (typeof this[key] === 'string' && obj[key] === '') return
          if (isHexColor(this[key]) && !isHexColor(obj[key])) return
          this[key] = obj[key]
          arr.push(key)
        }
      }
    }
    return arr
  }
}
module.exports = {
  ViewConfig,
}