const height = document.body.clientHeight
const main = (maxRouterNumber) => {
  document.getElementById('maxRouterNumber').innerHTML = `maxRouterLimit: ${maxRouterNumber}`
  const prefix = document.getElementById('prefix')
  const main = document.getElementById('main')
  main.style.display = 'flex'
  prefix.style.display = 'none'
  const app = document.getElementById('appView')
  const flag = height - 50 >= 667
  let appHeight = flag ? 667 : height
  let appWidth = flag ? 375 : 375 / 667 * appHeight
  app.style.width = `${appWidth}px`
  app.style.height = `${appHeight}px`
  const rect = app.getBoundingClientRect()
  nativeEvent.sent({ name: 'initToLoad', data: { x: parseInt(rect.x), y: parseInt(rect.y), width: parseInt(rect.width), height: parseInt(rect.height) } })
}
const prefixBox = () => {
  const inputURL = document.getElementById('inputURL')
  const inputRouter = document.getElementById('inputRouter')
  const okBtn = document.getElementById('okBtn')
  okBtn.addEventListener('click', () => {
    const url = inputURL.value
    const maxRouterNumber = Number(inputRouter.value)
    if (url.length > 0 && inputRouter.value.length > 0 && !isNaN(maxRouterNumber)) {
      nativeEvent.sent(
        { name: 'initToConfig', data: { url, maxRouterNumber } },
        (res) => {
          main(maxRouterNumber)
        },
        (err) => { }
      )
    }
  })
  cancelBtn.addEventListener('click', () => {
    nativeEvent.sent(
      { name: 'endToStart', data: null },
      (res) => {
        const prefix = document.getElementById('prefix')
        const main = document.getElementById('main')
        prefix.style.display = 'flex'
        main.style.display = 'none'
      },
      (err) => { }
    )
  })
}
prefixBox()
