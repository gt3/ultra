import warning from 'warning'
import { pipe, isStr, isFn } from './utils'
import { parseHref, env } from './utils-path'
import { createPopstate, push, replace, go } from './history'
import { makeVisit, recalibrate } from './visit'

function validateClick(e) {
  return !(e.defaultPrevented || e.button !== 0 || e.metaKey || e.altKey || e.ctrlKey || e.shiftKey)
}

function makeClickHandler({ href, state, title }, action) {
  function clickHandler(e) {
    if (validateClick(e)) {
      e.preventDefault()
      action(clickHandler.loc)
    }
  }
  clickHandler.loc = Object.assign(parseHref(href), { state, title })
  return clickHandler
}

function dispatcher(actions, msg) {
  let resolved = actions.some(fn => fn(msg))
  warning(resolved, 'Could not resolve location: %s', msg.href)
  return resolved
}

function getDispatcher(matchers) {
  let actions = matchers.map(matcher => pipe(matcher.match, matcher.resolve))
  return recordVisit.bind(null, dispatcher.bind(null, actions))
}

export function recordVisit(dispatch, msg) {
  let { ultra, state } = msg
  let { visited, newState } = makeVisit(ultra, state)
  ultra.visited = visited
  if (newState) {
    msg = Object.assign({}, msg, { state: newState })
    return replace(dispatch, msg)
  }
  return dispatch(msg)
}

function guardDispatch(ultra, dispatch, loc) {
  let [len, pausedHref, confirm] = ultra.pauseRecord, { href } = loc
  let msg = Object.assign({}, loc, { ultra })
  let ok = () => {
    ultra.resume()
    return dispatch(msg)
  }
  let cancel = pipe(recalibrate, go).bind(null, msg)
  if (confirm && len === env.history.length) {
    if (href !== pausedHref) return confirm(ok, cancel, msg)
  } else return ok()
}

function navigate(ultra, dispatch, navAction, loc) {
  loc = isStr(loc) ? parseHref(loc) : loc
  return guardDispatch(ultra, navAction.bind(null, dispatch), loc)
}

function run(_matchers, _popstate) {
  let _pauseRecord = [], dispatch = getDispatcher(_matchers)
  let ultra = {
    visited: null,
    get popstate() {
      return _popstate
    },
    get matchers() {
      return _matchers
    },
    get pauseRecord() {
      return _pauseRecord
    },
    resume() {
      return (_pauseRecord = [])
    },
    pause(cb) {
      return (_pauseRecord = [env.history.length, env.href, cb])
    },
    stop: _popstate.add(loc => guardDispatch(ultra, dispatch, loc)),
    nav: (action, loc) => navigate(ultra, dispatch, action, loc),
    replace: loc => ultra.nav(replace, loc),
    push: loc => ultra.nav(push, loc),
    navOnClick: (loc, cb, navAction = 'push') => {
      cb = isFn(cb) ? cb : parsed => ultra[navAction] && ultra[navAction](parsed)
      return makeClickHandler(loc, cb)
    }
  }
  return ultra
}

export function container(matchers, instance = {}) {
  let { stop, popstate, visited } = instance
  if (!popstate) popstate = createPopstate()
  let ultra = run(matchers, popstate)
  if (stop) stop.call(instance)
  if (Array.isArray(visited)) ultra.visited = visited
  else ultra.nav((cb, msg) => cb(msg), env.href)
  return ultra
}
