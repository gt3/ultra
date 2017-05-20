import { isStr, flattenToObj, hasOwn, empty, decodePath } from './utils'

const literalp = `([^\\s/]*)`
const identifierx = /(:[A-Za-z0-9_:]+)/
const trailingSlashx = /\/$/

function substitute(literals, values) {
  return String.raw({ raw: literals }, ...values)
}

function getMatchX(identifiers, literals) {
  let subs = new Array(identifiers.length).fill(literalp)
  return new RegExp(`^${substitute(literals, subs)}`, 'i')
}

let parsePathKey = pathKey => {
  let key = isStr(pathKey) ? pathKey.replace(trailingSlashx, '') : ''
  let fragments = key.split(identifierx)
  let identifiers = []
  let literals = fragments.reduce((acc, f) => {
    if (f.indexOf(':') === 0) identifiers.push(f)
    else acc.push(f)
    return acc
  }, [])
  let matchx = key == '' ? new RegExp('') : getMatchX(identifiers, literals)
  return { key: pathKey, identifiers, literals, matchx }
}

function assignValues(pathKey, values = []) {
  let { identifiers } = isStr(pathKey) ? parsePathKey(pathKey) : pathKey
  let res = identifiers.map((id, key) => ({ [id]: values[key] }))
  return flattenToObj(res)
}

function makeMatchPath(path) {
  return path.replace(trailingSlashx, '')
}

class Path {
  constructor(key) {
    Object.assign(this, parsePathKey(key))
  }
  findInvalid(checks, values) {
    let ids = this.identifiers, hasCheck = hasOwn.bind(checks)
    return empty(checks)
      ? -1
      : values.findIndex((val, i) => hasCheck(ids[i]) && !checks[ids[i]](values))
  }
  validate(checks, values) {
    let invalid = this.findInvalid(checks, values)
    return invalid === -1 ? { values, passed: true } : { values: values.slice(0, invalid) }
  }
  match(checks, pathname) {
    let matches = this.matchx.exec(pathname)
    if (!matches) return {}
    let match = matches[0], values = matches.slice(1).map(decodePath)
    let exact = match.length === pathname.length
    return Object.assign(this.validate(checks, values), { match, exact })
  }
  makeLink(values) {
    return substitute(this.literals, values)
  }
}

class PathSpec {
  constructor(pathKeys, next, err) {
    if (!Array.isArray(pathKeys) || !pathKeys.length) pathKeys = [isStr(pathKeys) ? pathKeys : '']
    let paths = pathKeys.map(k => new Path(k))
    Object.assign(this, { pathKeys, paths, next, err })
  }
  find(pathKey) {
    let idx = this.pathKeys.indexOf(pathKey)
    return idx > -1 && this.paths[idx]
  }
  match(checks, pathname) {
    let matchPath = makeMatchPath(pathname)
    let [primary, ...subs] = this.paths
    let result, matches = primary.match(checks, matchPath)
    if (matches.passed) {
      result = { [primary.key]: matches }
      subs.some(sub => {
        let submatches = sub.match(checks, matchPath)
        if (submatches.passed) result[sub.key] = submatches
        return submatches.exact
      })
    }
    return result
  }
  success(result) {
    return result && Object.keys(result).some(k => result[k].exact)
  }
  resolve(result, success = this.success(result)) {
    return !this.err || success ? this.next(result) : this.err(result)
  }
}

export function spec(...pathKeys) {
  return (next, err) => new PathSpec(pathKeys, next, err)
}

class PrefixSpec extends PathSpec {
  static strip(prefix, path) {
    return path.replace(prefix, '/').replace('//', '/')
  }
  get prefixKey() {
    return this.pathKeys[0]
  }
  match(checks, msg) {
    let { pathname } = msg, result = Object.assign({}, msg)
    let matches = super.match(checks, pathname)
    if (matches) {
      let prefix = matches[this.prefixKey].match
      pathname = PrefixSpec.strip(prefix, pathname)
      result = super.resolve(Object.assign(result, {pathname}), true)
    }
    else result.success = false
    return result
  }
}

export function prefixSpec(prefix, next) {
  return new PrefixSpec(prefix, next)
}

function rxToFn(rx) {
  return values => !empty(values.filter(rx.test.bind(rx)))
}

function makeCheck(id, rx) {
  return { [id]: isFn(rx) || rxToFn(rx) }
}

function rx(ids, rx) {
  return flattenToObj(ids.map(id => makeCheck(id, rx)))
}

export function check(...ids) {
  return rx.bind(null, ids)
}
