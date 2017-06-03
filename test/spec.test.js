import assert from 'assert'
import { eq, neq, oeq, oneq, mock } from './helpers'
import SpecRewired from '../src/spec'
import { spec, check, assignValues } from '../src/spec'

const getMatchX = SpecRewired.__GetDependency__('getMatchX')
const litp = SpecRewired.__GetDependency__('literalp')
const allx = SpecRewired.__GetDependency__('allx')
const parsePathKey = SpecRewired.__GetDependency__('parsePathKey')
const Path = SpecRewired.__GetDependency__('Path')
const PathSpec = SpecRewired.__GetDependency__('PathSpec')

function escape(path, ...ids) {
  path = ids.reduce((acc, id) => acc.replace(id, litp), path)
  return path.replace(/\//g, '\\/')
}

describe('spec', function() {
  it('getMatchX', function() {
    eq(getMatchX([], ['/']).source, escape('^/'))
    eq(getMatchX([':x'], ['/', '/']).source, escape('^/:x/', ':x'))
    eq(getMatchX([':x', ':y'], ['/', '/', '/']).source, escape('^/:x/:y/', ':x', ':y'))
    eq(getMatchX([':x', ':y'], ['/', '/abc/', '/']).source, escape('^/:x/abc/:y/', ':x', ':y'))
  })
  describe('parsePathKey', function() {
    it('should parse path and return correct key, identifiers, literals', function() {
      let key, identifiers, literals
      ;({ key, identifiers, literals } = parsePathKey('/:x/abc/:y/'))
      eq(key, '/:x/abc/:y/')
      oeq(identifiers, [':x', ':y'])
      oeq(literals, ['/', '/abc/', ''])
      ;({ key, identifiers, literals } = parsePathKey('/:x/:y/'))
      eq(key, '/:x/:y/')
      oeq(identifiers, [':x', ':y'])
      oeq(literals, ['/', '/', ''])
      ;({ key, identifiers, literals } = parsePathKey('/:x/'))
      eq(key, '/:x/')
      oeq(identifiers, [':x'])
      oeq(literals, ['/', ''])
      ;({ key, identifiers, literals } = parsePathKey('/'))
      eq(key, '/')
      oeq(identifiers, [])
      oeq(literals, ['/'])
    })
    it('should parse empty path and return match all regexp', function() {
      let key, identifiers, literals, matchx
      ;({ key, identifiers, literals, matchx } = parsePathKey(''))
      eq(matchx, allx)
      eq(key, '')
      oeq(identifiers, [])
      oeq(literals, [''])
    })
  })
  it('assignValues', function() {
    let expected = { ':x': 42, ':y': 43 }
    oeq(assignValues('/:x', [42]), { ':x': 42 })
    oeq(assignValues('/:x/:y', [42, 43]), expected)
    oeq(assignValues('/:x/:y/', [42, 43]), expected)
    oeq(assignValues(parsePathKey('/:x/:y'), [42, 43]), expected)
    oeq(assignValues('/:x/abc/:y', [42, 43]), expected)
    oeq(assignValues('/abc', [42, 43]), {})
    oeq(assignValues('/', [42, 43]), {})
    oeq(assignValues('/:x', []), {})
  })
})

describe('Path: match', function() {
  it('should return empty object on no matches', function() {
    oeq(new Path('/a').match('/b'), {})
  })
  it('exact should not be true for partial matches', function() {
    assert(!new Path('/a').match(null, '/').exact)
    assert(!new Path('/').match(null, '/a').exact)
    assert(!new Path('').match(null, '/a').exact)
    assert(new Path('/a').match(null, '/a').exact)
  })
  it('passed should be true for all matches', function() {
    assert(new Path('/').match(null, '/a').passed)
    assert(new Path('/a').match(null, '/a').passed)
    assert(new Path('').match(null, '/a').passed)
  })
  it('should validate values', function() {
    let valid = mock(true), invalid = mock(false)
    assert(new Path('/:x').match({ ':x': valid }, '/blah').passed)
    eq(valid.mock.calls.length, 1)
    oeq(valid.mock.calls[0][0], ['blah'])
    oeq(valid.mock.calls[0][1], { ':x': 'blah' })
    assert(!new Path('/:x').match({ ':x': invalid }, '/blah').passed)
    eq(invalid.mock.calls.length, 1)
  })
  it('should validate multiple values in a pathKey', function() {
    let valid = mock(true), invalid = mock(false)
    assert(
      !new Path('/:x/:y/:z').match({ ':x': valid, ':y': valid, ':z': invalid }, '/xxx//zzz').passed
    )
    eq(valid.mock.calls.length, 2)
    eq(invalid.mock.calls.length, 1)
    oeq(valid.mock.calls[0][0], ['xxx', '', 'zzz'])
    oeq(valid.mock.calls[0][1], { ':x': 'xxx', ':y': '', ':z': 'zzz' })
  })
  it('should not invoke remaining checks once validation fails', function() {
    let valid = mock(true), invalid = mock(false)
    assert(!new Path('/:x/:y').match({ ':x': invalid, ':y': valid }, '/xxx/yyy').passed)
    eq(invalid.mock.calls.length, 1)
    eq(valid.mock.calls.length, 0)
  })
})

describe('PathSpec', function() {
  it('should create pathspec when no keys are provided', function() {
    let instance = spec()()
    eq(instance.paths.length, 1)
    eq(instance.paths[0].key, '')
    eq(instance.paths[0].matchx, allx)
  })
  it('should create pathspec for a single key', function() {
    let i1 = new PathSpec('/xyz'), i2 = new PathSpec(['/xyz'])
    eq(i1.paths.length, 1)
    eq(i2.paths.length, 1)
    eq(i1.paths[0].key, '/xyz')
    eq(i2.paths[0].key, '/xyz')
  })
  it('should find path by pathkey', function() {
    let instance = spec('/xyz', '')()
    assert(instance.find(''))
    assert(instance.find('/xyz'))
  })
})
