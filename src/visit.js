import { env } from './router/utils-path'
const idk = '$id'

function place(n) {
  return [10, 100].find(x => n % x === n) || 100
}

function makeId(m, n = 0) {
  return m * place(n) + n
}

export function makeVisit(ultra, state) {
  let currLen = env.history.length, visited = ultra.visited || []
  let origId = state && state[idk], id, newState
  let [len, ...visits] = visited
  if (!len || currLen > len) {
    id = makeId(currLen)
    visited = [currLen, id]
  } else {
    id = origId || makeId(currLen, visits.length)
    if (!visits.length || id > visits[visits.length - 1]) {
      visited = [currLen, ...visits, id]
    }
  }
  if (origId !== id) newState = Object.assign({}, state, { [idk]: id })
  return { visited, newState }
}

export function recalibrate(msg) {
  let { ultra, state } = msg, currentLen = env.history.length
  let [len, ...visits] = ultra.visited, delta = 0
  if (state && state[idk] && currentLen === len) {
    delta = visits[visits.length - 1] === state[idk] ? -1 : 1
  }
  return delta
}
