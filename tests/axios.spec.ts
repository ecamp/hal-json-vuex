import HalJsonVuex from '../src/index'
import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'
import { cloneDeep } from 'lodash'
import { newServer } from 'mock-xmlhttprequest'

let store
let stateCopy
let halJsonVuex
let server

describe('When using baseUrl with axios', () => {
  beforeAll(() => {
    Vue.use(Vuex)
    store = new Vuex.Store({
      modules: {},
      strict: process.env.NODE_ENV !== 'production'
    })
    stateCopy = cloneDeep(store.state)
  })

  beforeEach(() => {
    server = newServer()
    server.install()

    store.replaceState(cloneDeep(stateCopy))
    halJsonVuex = HalJsonVuex(store, axios, { forceRequestedSelfLink: true })
  })

  afterEach(() => {
    server.remove()
  })

  const baseUrlParams = [
    {
      baseUrl: 'http://localhost:3000',
      api: {
        entities: {
          href: '/entities'
        },
        _links: {
          self: {
            href: 'http://localhost:3000/'
          }
        }
      },
      expectedFetches: [
        'http://localhost:3000',
        'http://localhost:3000/entities'
      ]
    },
    {
      baseUrl: 'http://localhost:3000/api',
      api: {
        entities: {
          href: '/api/entities'
        },
        _links: {
          self: {
            href: 'http://localhost:3000/api'
          }
        }
      },
      expectedFetches: [
        'http://localhost:3000/api',
        'http://localhost:3000/api/api/entities'
      ]
    },
    {
      baseUrl: '/api',
      api: {
        entities: {
          href: '/api/entities'
        },
        _links: {
          self: {
            href: '/api'
          }
        }
      },
      expectedFetches: [
        '/api/api',
        '/api/api/entities'
      ]
    }
  ]
  baseUrlParams.forEach(({ baseUrl, api, expectedFetches }) => {
    it(`uses [${expectedFetches}] for get when baseUrl is ${baseUrl}`, async () => {
      axios.defaults.baseURL = baseUrl
      server.get(() => true, { status: 200, headers: {}, body: JSON.stringify(api), statusText: 'OK' })

      const url = await halJsonVuex.href(halJsonVuex.get(), 'entities')
      await halJsonVuex.get(url).load

      const requestLog = server.getRequestLog()
      expect(requestLog.map(entry => entry.url)).toEqual(expectedFetches)
    })
  })

  baseUrlParams.forEach(({ baseUrl, api, expectedFetches }) => {
    it(`uses [${expectedFetches}] for post when baseUrl is ${baseUrl}`, async () => {
      axios.defaults.baseURL = baseUrl
      server.get(() => true, { status: 200, headers: {}, body: JSON.stringify(api), statusText: 'OK' })
      server.post(() => true, { status: 201, headers: {}, body: JSON.stringify(api), statusText: 'OK' })

      const url = await halJsonVuex.href(halJsonVuex.get(), 'entities')
      await halJsonVuex.post(url, {}).load

      const requestLog = server.getRequestLog()
      expect(requestLog.map(entry => entry.url)).toEqual(expectedFetches)
    })
  })

  baseUrlParams.forEach(({ baseUrl, api, expectedFetches }) => {
    it(`uses [${expectedFetches}] for patch when baseUrl is ${baseUrl}`, async () => {
      axios.defaults.baseURL = baseUrl
      server.get(() => true, { status: 200, headers: {}, body: JSON.stringify(api), statusText: 'OK' })
      server.addHandler('PATCH', () => true, { status: 200, headers: {}, body: JSON.stringify(api), statusText: 'OK' })

      const url = await halJsonVuex.href(halJsonVuex.get(), 'entities')
      await halJsonVuex.patch(url, {}).load

      const requestLog = server.getRequestLog()
      expect(requestLog.map(entry => entry.url)).toEqual(expectedFetches)
    })
  })

  baseUrlParams.forEach(({ baseUrl, api, expectedFetches }) => {
    it(`uses [${expectedFetches}] for delete when baseUrl is ${baseUrl}`, async () => {
      axios.defaults.baseURL = baseUrl
      server.get(() => true, { status: 200, headers: {}, body: JSON.stringify(api), statusText: 'OK' })
      server.delete(() => true, { status: 200, headers: {}, body: JSON.stringify(api), statusText: 'OK' })

      const url = await halJsonVuex.href(halJsonVuex.get(), 'entities')
      await halJsonVuex.del(url, {}).load

      const requestLog = server.getRequestLog()
      expect(requestLog.map(entry => entry.url)).toEqual(expectedFetches)
    })
  })
})
