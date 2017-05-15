import { pipe, isStr } from './utils'
import warning from 'warning'
import { createPopstate, push, replace, recalibrate } from './history'

function recordVisit(msg) {
  let { ultra, pathname } = msg, currentLen = history.length
  console.log('before:', ultra.visited)
  if(!ultra.visited) { ultra.visited = [] }
  let [len, ...visits] = ultra.visited
  if(!len || currentLen > len) {
    ultra.visited = [currentLen, pathname]
  }
  else {
    ultra.visited = [currentLen, ...visits.concat(pathname).slice(-currentLen)]
  }
  console.log('after:', ultra.visited)
}

function getDispatch(matchers) {
  let actions = matchers.map(matcher => pipe(matcher.match, matcher.process))
  return msg => { recordVisit(msg); actions.some(fn => fn(msg)) }
}

function guardDispatch(ultra, dispatch, loc) {
  let [len, stickyPath, confirm] = ultra.pauseRecord, { pathname } = loc
  let msg = Object.assign({}, loc, { ultra, stickyPath })
  let ok = () => {
    ultra.resume()
    console.log('ok...')
    return dispatch(msg)
  }
  let cancel = recalibrate.bind(null, msg)
  if(confirm && len === history.length) {
    if(pathname !== stickyPath) return confirm(ok, cancel, msg)
    else { console.log('result of go action - do nothing'); }
  }
  else return ok()
}

function verify(matchers, loc) {
  return matchers.some(matcher => matcher.match(loc).success)
}

function toPath(loc) {
  return isStr(loc) ? { pathname: loc } : loc
}

function navigate(ultra, dispatch, navAction, loc) {
  let {pauseRecord, matchers} = ultra, action = navAction.bind(null, dispatch)
  loc = toPath(loc)
  warning(verify(matchers, loc), 'At least one path should be an exact match: %s', loc.pathname)
  return guardDispatch(ultra, action, loc)
}

function run(matchers, popstate) {
  let _pauseRecord = [], dispatch = getDispatch(matchers)
  let ultra = {
    get pauseRecord() { return _pauseRecord },
    resume() { return _pauseRecord = [] },
    pause(cb) { return _pauseRecord = [history.length, location.pathname, cb] },
    stop: popstate.add(loc => guardDispatch(ultra, dispatch, loc)),
    go: (action, loc) => navigate(ultra, dispatch, action, loc),
    push: loc => ultra.go(push, loc),
    replace: loc => ultra.go(replace, loc),
    popstate,
    matchers
  }
  return ultra
}

function initialize(matchers, ultraOptions = {}) {
  let { stop, matchers: currentMatchers, popstate, preventCurrent } = ultraOptions
  if (stop) stop.call(ultraOptions)
  if (currentMatchers) matchers = currentMatchers.concat(matchers)
  if (!popstate) popstate = createPopstate()
  let ultra = run(matchers, popstate)
  if(!preventCurrent) ultra.go((cb, msg) => cb(msg), location.pathname)
  return ultra
}

export function container(...matchers) {
  return initialize.bind(null, matchers)
}
