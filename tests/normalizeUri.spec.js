import normalizeEntityUri from '../src/normalizeEntityUri'

describe('URI normalizing', () => {
  it('sorts query parameters correctly', () => {
    // given
    const examples = {
      '': '',
      '/': '/',
      '/?': '/',
      '?': '',
      'http://localhost': 'http://localhost',
      'http://localhost/': 'http://localhost/',
      'https://scout.ch:3000': 'https://scout.ch:3000',
      'https://scout.ch:3000/': 'https://scout.ch:3000/',
      'http://localhost/?': 'http://localhost/',
      '/camps/1': '/camps/1',
      '/camps/': '/camps/',
      '/camps': '/camps',
      '/camps/1?': '/camps/1',
      '/camps/?page=0': '/camps/?page=0',
      '/camps/?page=0&abc=123': '/camps/?abc=123&page=0',
      '/camps?page=0&abc=123': '/camps?abc=123&page=0',
      '/camps?page=0&abc=123&page=1': '/camps?abc=123&page=0&page=1',
      '/camps?page=1&abc=123&page=0': '/camps?abc=123&page=1&page=0',
      '/camps?page=0&xyz=123&page=1': '/camps?page=0&page=1&xyz=123',
      '/camps/?e[]=abc&a[]=123&a=test': '/camps/?a=test&a%5B%5D=123&e%5B%5D=abc'
    }

    Object.entries(examples).forEach(([example, expected]) => {
      // when
      const result = normalizeEntityUri(example)

      // then
      expect(result).toEqual(expected)
    })
  })

  it('handles null', () => {
    // given

    // when
    const result = normalizeEntityUri(null)

    // then
    expect(result).toEqual(null)
  })

  it('treats undefined as root URI, to enable this.api.get() without parameters to be the same as this.api.get(\'\')', () => {
    // given

    // when
    const result = normalizeEntityUri(undefined)

    // then
    expect(result).toEqual('')
  })

  it('treats undefined as root URI, to enable this.api.get() without parameters to be the same as this.api.get(\'\')', () => {
    // given

    // when
    const result = normalizeEntityUri(undefined)

    // then
    expect(result).toEqual('')
  })

  const baseUrlParams =
    [
      {
        baseUrl: undefined,
        uri: '/api/activities',
        normalized: '/api/activities'
      },
      {
        baseUrl: null,
        uri: '/api/activities',
        normalized: '/api/activities'
      },
      {
        baseUrl: '',
        uri: '/api/activities',
        normalized: '/api/activities'
      },
      {
        baseUrl: '/api',
        uri: '/api/activities',
        normalized: '/activities'
      },
      {
        baseUrl: 'http://localhost:3000',
        uri: 'http://localhost:3000/api/activities',
        normalized: '/api/activities'
      },
      {
        baseUrl: 'http://localhost:3000',
        uri: '/api/activities',
        normalized: '/api/activities'
      },
      {
        baseUrl: 'http://localhost:3000/api',
        uri: 'http://localhost:3000/api/activities',
        normalized: '/activities'
      },
      {
        baseUrl: 'http://localhost:3000/api',
        uri: '/api/activities',
        normalized: '/activities'
      },
      {
        baseUrl: 'http://localhost:3000/api/',
        uri: '/api/activities',
        normalized: '/activities'
      },
      {
        baseUrl: 'http://localhost:3000/api/',
        uri: 'http://localhost:3000/print/activities',
        normalized: 'http://localhost:3000/print/activities'
      }
    ]

  baseUrlParams.forEach(({ baseUrl, uri, normalized }) => {
    it(`normalizes ${uri} when baseUrl is ${baseUrl} to ${normalized}`, () => {
      expect(normalizeEntityUri(uri, baseUrl)).toEqual(normalized)
    })
  })
})
