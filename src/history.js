import Listener from './listener'
import { $devWarnOn } from './router/utils'
import { encodePath, env } from './router/utils-path'

function invokeHandlers(handlers) {
  function invoke(event, fn) {
    let { href, path, qs, hash } = env, state = event.state
    return fn({ href, path, qs, hash, state })
  }
  return event => handlers().forEach(invoke.bind(null, event))
}

function createPopstate() {
  return new Listener('popstate', env.window, invokeHandlers)
}

let push = (success, msg) => {
  let { href, path, state, docTitle } = msg
  if (href !== env.href) {
    $devWarnOn(
      () => encodePath(path) !== path,
      `Incorrect encoding. Use encodeURI on path: ${path}`
    )
    env.history.pushState(state, docTitle, href)
    if (success) return success(msg)
  } else $devWarnOn(() => true, `Attempt to push location identical to current one: ${href}`)
}

let replace = (success, msg) => {
  let { href, path, state, docTitle } = msg
  $devWarnOn(() => encodePath(path) !== path, `Incorrect encoding. Use encodeURI on path: ${path}`)
  env.history.replaceState(state, docTitle, href)
  if (success) return success(msg)
}

let go = val => val && env.history.go(val)

export { createPopstate, push, replace, go }
