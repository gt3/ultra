import { isStr, isFn, pipe, flattenToObj, hasOwn } from './utils'

const URIComponentBlacklist = `([^\s#$&+,/:;=?@]*)`
const identifierx = /(:[A-Za-z0-9_:]+)/

function substitute(literals, values) {
  return String.raw({ raw: literals }, ...values)
}

function getMatchX(identifiers, literals) {
  let subs = new Array(identifiers.length).fill(URIComponentBlacklist)
  return new RegExp(`^${substitute(literals, subs)}`, 'i')
}

let parsePathKey = key => {
  let fragments = key.split(identifierx)
  let identifiers = []
  let literals = fragments.reduce((acc, f) => {
    if (f.startsWith(':')) identifiers.push(f)
    else acc.push(f)
    return acc
  }, [])
  let matchx = getMatchX(identifiers, literals)
  return { key, identifiers, literals, matchx }
}

export function assignValues(pathKey, values = []) {
  let { identifiers } = isStr(pathKey) ? parsePathKey(pathKey) : pathKey
  let res = identifiers.map((id, key) => ({ [id]: values[key] }))
  return flattenToObj(res)
}

export class Path {
  constructor(key) {
    Object.assign(this, parsePathKey(key))
  }
  findInvalid(validator, values) {
    let ids = this.identifiers, check = hasOwn.bind(validator)
    return values.findIndex((val, i) => check(ids[i]) && !validator[ids[i]](val))
  }
  validate(validator, values, exact) {
    let invalid = this.findInvalid(validator, values)
    return invalid === -1 ? { match, values, passed: true, exact } : { match, values: values.slice(0, invalid) }
  }
  match(validator, locationPath) {
    let matches = this.matchx.exec(locationPath)
    if(!matches) return {}
    let match = matches[0], values = matches.slice(1).map(decodeURIComponent)
    let exact = match.length === locationPath.length
    return this.validate(validator, values, exact)
  }
  makeLink(values) {
    return substitute(this.literals, values)
  }
}

class PathSpec {
  constructor(pathKeys, next, err) {
    let paths = pathKeys.map(k => new Path(k))
    Object.assign(this, { pathKeys, paths, next, err })
  }
  find(pathKey) {
    let idx = this.pathKeys.indexOf(pathKey)
    return idx > -1 && this.paths[idx]
  }
  match(locationPath, validator) {
    let [primary, ...subs] = this.paths
    let result, matches = primary.match(validator, locationPath)
    if (matches.passed) {
      result = {}
      result[primary.key] = matches
      subs.some(sub => {
        let submatches = sub.match(validator, locationPath)
        if(submatches.passed) result[sub.key] = submatches
        return submatches.exact
      })
    }
    return result
  }
  sucess(result) {
    return result && Object.keys(result).some(k => result[k].exact)
  }
  realize(result) {
    if(sucess(result)) this.next(result)
    else this.err(result)
  }
}

function actions(pathKeys, next, err) {
  return new PathSpec(pathKeys, next, err)
}

export function spec(...pathKeys) {
  return actions.bind(null, pathKeys)
}

function rxToFn(rx) {
  return values => values.filter(rx.test.bind(rx))
}

function validator(id, rx) {
  return { [id]: rxToFn(rx) }
}

function rx(ids, rx) {
  return ids.map(id => validator(id, rx))
}

export function checks(...ids) {
  return rx.bind(null, ids)
}
