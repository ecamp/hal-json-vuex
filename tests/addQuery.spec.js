import addQuery from '../src/addQuery.ts'

describe('appending query parameters', () => {
  it('appends the query parameters', () => {
    // given
    const examples = [
      ['', {}, ''],
      ['http://localhost:3000/index.html', {}, 'http://localhost:3000/index.html'],
      ['http://localhost:3000/index.html?query=param', {}, 'http://localhost:3000/index.html?query=param'],
      ['http://localhost:3000/index.html?query=param&query=again', {}, 'http://localhost:3000/index.html?query=param&query=again'],
      ['http://localhost:3000/index.html?', {}, 'http://localhost:3000/index.html?'],
      ['http://localhost:3000/index.html?multi[]=test', {}, 'http://localhost:3000/index.html?multi[]=test'],
      ['', { single: 'param' }, '?single=param'],
      ['', { double: ['param', 'fun'] }, '?double=param&double=fun'],
      ['', { one: 1, two: true, three: ['hello', 'world'] }, '?one=1&two=true&three=hello&three=world'],
      ['', { 'three[]': ['hello', 'world'] }, '?three%5B%5D=hello&three%5B%5D=world'],
      ['http://localhost:3000/index.html', { one: 1, two: true, 'three[]': ['hello', 'world'] }, 'http://localhost:3000/index.html?one=1&two=true&three%5B%5D=hello&three%5B%5D=world'],
      ['http://localhost:3000/index.html?one=zero', { one: 1, two: true, 'three[]': ['hello', 'world'] }, 'http://localhost:3000/index.html?one=zero&one=1&two=true&three%5B%5D=hello&three%5B%5D=world'],
      ['http://localhost:3000/index.html?two=none', { one: 1, two: true, 'three[]': ['hello', 'world'] }, 'http://localhost:3000/index.html?two=none&one=1&two=true&three%5B%5D=hello&three%5B%5D=world'],
      ['http://localhost:3000/index.html?', { one: 1, two: true, 'three[]': ['hello', 'world'] }, 'http://localhost:3000/index.html?one=1&two=true&three%5B%5D=hello&three%5B%5D=world'],
      ['http://localhost:3000/index.html?multi[]=test', { 'multi[]': ['hello', 'world'] }, 'http://localhost:3000/index.html?multi%5B%5D=test&multi%5B%5D=hello&multi%5B%5D=world'],
    ]

    examples.forEach(([url, params, expected]) => {
      // when
      const result = addQuery(url, params)

      // then
      expect(result).toEqual(expected)
    })
  })

  it('handles null params', () => {
    // given

    // when
    const result = addQuery('', null)

    // then
    expect(result).toEqual('')
  })

  it('handles undefined params', () => {
    // given

    // when
    const result = addQuery('', undefined)

    // then
    expect(result).toEqual('')
  })

  it('handles null uri', () => {
    // given

    // when
    const result = addQuery(null, { test: '1' })

    // then
    expect(result).toEqual(null)
  })

  it('handles undefined uri', () => {
    // given

    // when
    const result = addQuery(undefined, { test: '1' })

    // then
    expect(result).toEqual(undefined)
  })
})
