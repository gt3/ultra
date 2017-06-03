import assert from 'assert'
import { eq, neq, oeq, oneq, mock } from './helpers'
import * as u from '../src/utils-path'

describe('path utils', function() {
  it('normalizeHref', function() {
    let norm = u.normalizeHref
    eq(norm()('abc/def/'), '/abc/def')
    eq(norm('')('/abc/def/'), '/abc/def')
    eq(norm('/')('/abc/def/'), '/abc/def')
    eq(norm('/abc/')('/abc/def/'), '/def')
    eq(norm('abc')('/abc/def'), '/abc/def')
    eq(norm('/abc/def')('/abc/def/'), '/')
    eq(norm('*$%^')('*$%^abc/def'), '/abc/def')
  })
  it('encodePath', function() {
    let enc = u.encodePath
    let asis = `[#$&+,/:;=?@]!'()*-.~`
    eq(enc(asis), asis)
  })
  it('decodePath', function() {
    let dec = u.decodePath
    let asis = `[#$&+,/:;=?@]!'()*-.~`
    eq(dec(asis), asis)
    eq(dec('%20'), ' ')
    eq(dec('%'), '')
  })
  it('verifyURIEncoding', function() {
    let verify = u.verifyURIEncoding
    let asis = `[#$&+,/:;=?@]!'()*-.~`
    assert(verify(asis))
    eq(verify('[]'), true)
    eq(verify('^'), false)
    eq(verify('%'), false)
    eq(verify(''), true)
  })
  it('verifyDataEncoding', function() {
    let verify = u.verifyDataEncoding
    let asis = `!'()*-.~`
    assert(verify(asis))
    eq(verify('[]'), false)
    eq(verify('%'), false)
    eq(verify(''), true)
  })
  it('parseQS', function() {
    let parse = u.parseQS
    eq(parse('?x=42', ['x']), '/42')

    eq(parse('x=42', ['x']), '/42')
    eq(parse('x=42', ['x'], '/'), '/42')
    eq(parse('x=42', ['y'], '/'), '/')
    eq(parse('?&&;x=42', ['x']), '/42')

    eq(parse('?x=42&x=42', ['x']), '/42,42')
    eq(parse('?x=43&y=007&x=42', ['x', 'y']), '/43,42/007')
    eq(parse('x=42&x=42&y=007', ['y', 'x'], '/abc', '&'), '/abc/007/42&42')
    eq(parse('?x=42;y=007', ['x', 'y']), '/42/007')

    eq(parse('?x=43&&&x=42', ['x']), '/43,42')
    eq(parse('?x=42&x=42', ['x'], '/abc'), '/abc/42,42')
    eq(parse('?x=42&x=42', ['x'], '/abc', '&'), '/abc/42&42')

    eq(parse('', [], 'abc'), 'abc')
    eq(parse('?', [''], '/'), '/')
    eq(parse('?', ['x'], 'abc'), 'abc/')
    eq(parse('?blahblahblah', ['x', 'y', 'z'], '/abc'), '/abc///')
  })
  it('parseHref', function() {
    let parse = u.parseHref
    let test = (xhref, xpath, xqs, xhash) => actual => {
      let { href, path, qs = '', hash = '' } = actual
      return oeq([href, path, qs, hash], [xhref, xpath, xqs, xhash])
    }
    test('/abc?x=42#xyz', '/abc', 'x=42', 'xyz')(parse('/abc?x=42#xyz'))
    test('/abc/?x=42#xyz', '/abc/', 'x=42', 'xyz')(parse('/abc/?x=42#xyz'))
    test('/abc#xyz', '/abc', '', 'xyz')(parse('/abc#xyz'))
    test('/abc?xyz', '/abc', 'xyz', '')(parse('/abc?xyz'))
    test('/?xyz#xyz', '/', 'xyz', 'xyz')(parse('/?xyz#xyz'))
    test('?xyz#xyz', '', 'xyz', 'xyz')(parse('?xyz#xyz'))
    test('#xyz?xyz', '', '', 'xyz?xyz')(parse('#xyz?xyz'))
    test('/abc', '/abc', '', '')(parse('/abc'))
  })
})
