function noop() {}

function isFn(t) {
  return typeof t === 'function' ? t : void 0
}

const strProto = Object.getPrototypeOf('')
function isStr(s) {
  return Object.getPrototypeOf(Object(s)) === strProto
}

function empty(t) {
  return !t || !(Array.isArray(t) ? t : Object.keys(t)).length
}

const invokeFn = Function.prototype.call.bind(Function.prototype.call)

function pipe(...fns) {
  function invoke(v) {
    return fns.reduce((acc, fn) => (fn ? fn.call(this, acc) : acc), v)
  }
  return invoke
}

const m2f = (mKey, fn) => fn && (arr => Array.prototype[mKey].call(arr, fn))

const flattenToObj = (arr, base = {}) => Object.assign(base, ...arr)
const pipeOverKeys = (obj, ...fns) => obj && pipe(...fns)(Object.keys(obj))
const mapOverKeys = (obj, mapper) => pipeOverKeys(obj, m2f('map', mapper))

const hasOwn = Object.prototype.hasOwnProperty

function shieldProps(t, ...keys) {
  let keep = flattenToObj(
    Object.keys(t).filter(k => !keys.includes(k)).map(k => ({ [k]: t[k] }))
  )
  return Object.setPrototypeOf(keep, t)
}

export {
  noop,
  isFn,
  isStr,
  empty,
  invokeFn,
  pipe,
  flattenToObj,
  mapOverKeys,
  hasOwn,
  shieldProps
}

function isClickValid(e) {
  return !(e.defaultPrevented ||
    e.button !== 0 ||
    e.metaKey ||
    e.altKey ||
    e.ctrlKey ||
    e.shiftKey)
}

export { isClickValid }
