let defaultHandler = handlers => (...args) => handlers.forEach(h => h(...args))

export default class Listener extends Set {
  constructor(eventKey, target = window, handler = defaultHandler) {
    super()
    handler = handler(this)
    Object.assign(this, {eventKey, target, handler, active: false})
  }
  beginListen() {
    if(!this.active) {
      this.target.addEventListener(this.eventKey, this.handler)
      this.active = true
    }
  }
  stopListen() {
    if(this.active) {
      this.active = false
      this.target.removeEventListener(this.eventKey, this.handler)
    }
  }
  add(val) {
    this.beginListen()
    super.add.call(this, val)
    return this.delete.bind(this, val)
  }
  delete(val) {
    let res = super.delete.call(this, val)
    if(this.size === 0) this.stopListen()
    return res
  }
  clear() {
    this.stopListen()
    super.call(this)
  }
}
