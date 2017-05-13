import Listener from './listener'
import warning from 'warning'

function getPathname() {
  return location.pathname
}

function invokeHandlers(handlers) {
  function invoke(event, fn) {
    let pathname = getPathname(), state = event && (event.state || event.detail)
    return fn({ pathname, state, event })
  }
  return event => handlers().forEach(invoke.bind(null, event))
}

function createPopstate() {
  return new Listener('popstate', window, invokeHandlers)
}

let push = msg => {
  let {pathname, state, title} = msg
  warning(pathname === getPathname(), 'Attempt to push path identical to current path: %s', pathname)
  history.pushState(state, title, pathname)
  return msg
}

let replace = msg => {
  let {pathname, state, title} = msg
  history.replaceState(state, title, pathname)
  return msg
}

export { createPopstate, push, replace }
