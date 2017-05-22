import { isStr, pipe } from './utils'
import { normalizePath } from './utils-path'
import { prefixSpec } from './spec'

function findPath(specs, pathKey) {
  let result
  specs.find(spec => !!(result = spec.find(pathKey)))
  return result
}

function addPrefix(prefix, path) {
  return isStr(prefix) && path.indexOf(prefix) !== 0 ? `${prefix}${path}` : path
}

function linkFromPathKey(specs, prefix, pathKey, values = [], usePrefix = true) {
  let link, path = findPath(specs, pathKey)
  if (usePrefix && path) link = addPrefix(prefix, path.makeLink(values))
  return link || ''
}

function matcher(specs, checks, msg) {
  let spec, result, { pathname } = msg
  spec = specs.find(spec => !!(result = spec.match(checks, pathname)))
  let success = spec && spec.success(result)
  result = Object.assign({}, msg, result)
  return { result, success, spec }
}

function process({ result, success, spec }) {
  return spec ? spec.resolve(result, success) : false
}

function matchPrefix(matcher) {
  let { prefix, match, checks } = matcher, result = matcher
  if (prefix) {
    let pspec = prefixSpec(prefix, match)
    result.match = pspec.match.bind(pspec, checks)
  }
  return result
}

function prematch(prespec, msg) {
  let { prefix, pathname } = msg
  pathname = pipe(normalizePath(prefix), prespec, normalizePath())(pathname)
  return pathname === msg.pathname ? msg : Object.assign({}, msg, { pathname })
}

export function match(specs, checks = {}, prefix, prespec) {
  if (!Array.isArray(specs)) specs = [].concat(specs)
  let match = pipe(prematch.bind(null, prespec), matcher.bind(null, specs, checks))
  return matchPrefix({ match, process, prefix, specs, checks })
}
