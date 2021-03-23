import { createLocalVue, mount } from '@vue/test-utils'
import HalJsonVuex from '../src'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import VueAxios from 'vue-axios'
import Vuex from 'vuex'
import Vue from 'vue'
import { cloneDeep } from 'lodash'
import embeddedSingleEntity from './resources/embedded-single-entity'
import StoreValue from '../src/StoreValue'
import LoadingStoreValue from '../src/LoadingStoreValue'
import EmbeddedCollection from '../src/EmbeddedCollection'

async function letNetworkRequestFinish () {
  await new Promise(resolve => {
    setTimeout(() => resolve())
  })
}

let axiosMock
let store
let vm
let stateCopy

describe('Using dollar methods', () => {
  beforeAll(() => {
    axios.defaults.baseURL = 'http://localhost'
    Vue.use(Vuex)
    store = new Vuex.Store({
      modules: {},
      strict: process.env.NODE_ENV !== 'production'
    })
    stateCopy = cloneDeep(store.state)
  })

  beforeEach(() => {
    axiosMock = new MockAdapter(axios)
    store.replaceState(cloneDeep(stateCopy))
    const localVue = createLocalVue()
    localVue.use(Vuex)
    localVue.use(VueAxios, axios)
    localVue.use(HalJsonVuex(store, axios, { forceRequestedSelfLink: true }))
    const wrapper = mount({ store, template: '<div></div>' }, { localVue })
    vm = wrapper.vm
  })

  afterEach(() => {
    axiosMock.restore()
  })

  it('$reloads entity and stores the response into the store', async done => {
    // given
    axiosMock.onGet('http://localhost/camps').replyOnce(200, {
      _embedded: {
        items: []
      },
      _links: {
        self: {
          href: '/camps'
        }
      }
    })
    axiosMock.onGet('http://localhost/camps').replyOnce(200, embeddedSingleEntity.serverResponse)

    vm.api.get('/camps')
    await letNetworkRequestFinish()
    const camps = vm.api.get('/camps')
    expect(camps).toBeInstanceOf(StoreValue)

    // when
    const load = camps.$reload()

    // then
    await letNetworkRequestFinish()
    expect(await load).toMatchObject({ id: 1, _meta: { self: 'http://localhost/camps' } })
    done()
  })

  it('does not $reload a loading entity', async done => {
    // given
    axiosMock.onGet('http://localhost/camps').replyOnce(200, {
      id: 2,
      _links: {
        self: {
          href: '/camps'
        }
      }
    })
    axiosMock.onGet('http://localhost/camps').networkError()

    const camps = vm.api.get('/camps')
    expect(camps).toBeInstanceOf(LoadingStoreValue)

    // when
    const load = camps.$reload()

    // then
    await letNetworkRequestFinish()
    expect(await load).toMatchObject({ id: 2, _meta: { self: 'http://localhost/camps' } })
    done()
  })

  it('$posts entity and stores the response into the store', async done => {
    // given
    axiosMock.onGet('http://localhost/camps').reply(200, {
      _embedded: {
        items: []
      },
      _links: {
        self: {
          href: '/camps'
        }
      }
    })
    axiosMock.onPost('http://localhost/camps').reply(200, embeddedSingleEntity.serverResponse)

    vm.api.get('/camps')
    await letNetworkRequestFinish()
    const camps = vm.api.get('/camps')
    expect(camps).toBeInstanceOf(StoreValue)

    // when
    const load = camps.$post({ some: 'thing' })

    // then
    await letNetworkRequestFinish()
    expect(await load).toMatchObject({ id: 1, _meta: { self: 'http://localhost/camps/1' } })
    expect(vm.api.get('/camps/1')).toMatchObject({ id: 1, _meta: { self: 'http://localhost/camps/1' } })
    expect(vm.api.get('/campTypes/20')).toMatchObject({
      id: 20,
      name: 'camp',
      js: true,
      targetGroup: 'Kids',
      _meta: { self: 'http://localhost/campTypes/20' }
    })
    done()
  })

  it('$posts onto loading entity and stores the response into the store', async done => {
    // given
    axiosMock.onGet('http://localhost/camps').reply(200, {
      _embedded: {
        items: []
      },
      _links: {
        self: {
          href: '/camps'
        }
      }
    })
    axiosMock.onPost('http://localhost/camps').reply(200, embeddedSingleEntity.serverResponse)

    const camps = vm.api.get('/camps')
    expect(camps).toBeInstanceOf(LoadingStoreValue)

    // when
    const load = camps.$post({ some: 'thing' })

    // then
    await letNetworkRequestFinish()
    expect(await load).toMatchObject({ id: 1, _meta: { self: 'http://localhost/camps/1' } })
    expect(vm.api.get('/camps/1')).toMatchObject({ id: 1, _meta: { self: 'http://localhost/camps/1' } })
    expect(vm.api.get('/campTypes/20')).toMatchObject({
      id: 20,
      name: 'camp',
      js: true,
      targetGroup: 'Kids',
      _meta: { self: 'http://localhost/campTypes/20' }
    })
    done()
  })

  it('$patches entity and stores the response into the store', async done => {
    // given
    axiosMock.onGet('http://localhost/camps').reply(200, {
      _embedded: {
        items: []
      },
      _links: {
        self: {
          href: '/camps'
        }
      }
    })
    axiosMock.onPatch('http://localhost/camps').reply(200, {
      some: 'thing',
      _embedded: {
        items: []
      },
      _links: {
        self: {
          href: '/camps'
        }
      }
    })
    vm.api.get('/camps')
    await letNetworkRequestFinish()
    const camps = vm.api.get('/camps')
    expect(camps).toBeInstanceOf(StoreValue)

    // when
    const load = camps.$patch({ some: 'thing' })

    // then
    await letNetworkRequestFinish()
    expect(await load).toMatchObject({ some: 'thing', _meta: { self: 'http://localhost/camps' } })
    done()
  })

  it('$patches loading entity and stores the response into the store', async done => {
    // given
    axiosMock.onGet('http://localhost/camps').reply(200, {
      _embedded: {
        items: []
      },
      _links: {
        self: {
          href: '/camps'
        }
      }
    })
    axiosMock.onPatch('http://localhost/camps').reply(200, {
      some: 'thing',
      _embedded: {
        items: []
      },
      _links: {
        self: {
          href: '/camps'
        }
      }
    })
    const camps = vm.api.get('/camps')
    expect(camps).toBeInstanceOf(LoadingStoreValue)

    // when
    const load = camps.$patch({ some: 'thing' })

    // then
    await letNetworkRequestFinish()
    expect(await load).toMatchObject({ some: 'thing', _meta: { self: 'http://localhost/camps' } })
    done()
  })

  it('$deletes entity and removes it from the store', async done => {
    // given
    axiosMock.onGet('http://localhost/camps/1').replyOnce(200, embeddedSingleEntity.serverResponse)
    axiosMock.onGet('http://localhost/camps/1').reply(404)
    axiosMock.onDelete('http://localhost/camps/1').reply(204)

    vm.api.get('/camps/1')
    await letNetworkRequestFinish()
    const camp = vm.api.get('/camps/1')
    expect(camp).toBeInstanceOf(StoreValue)

    // when
    camp.$del()

    // then
    await letNetworkRequestFinish()
    expect(store.state.api).not.toHaveProperty('/camps/1')
    done()
  })

  it('$deletes loading entity and removes it from the store', async done => {
    // given
    axiosMock.onGet('http://localhost/camps/1').replyOnce(200, embeddedSingleEntity.serverResponse)
    axiosMock.onGet('http://localhost/camps/1').reply(404)
    axiosMock.onDelete('http://localhost/camps/1').reply(204)

    const camp = vm.api.get('/camps/1')
    expect(camp).toBeInstanceOf(LoadingStoreValue)

    // when
    camp.$del()

    // then
    await letNetworkRequestFinish()
    expect(store.state.api).not.toHaveProperty('/camps/1')
    done()
  })

  it('does nothing when $loadItems is called on an entity', async done => {
    // given
    axiosMock.onGet('http://localhost/camps').replyOnce(200, {
      _embedded: {
        items: [{
          id: 123,
          _links: {
            self: {
              href: '/items/123'
            }
          }
        }]
      },
      _links: {
        self: {
          href: '/camps'
        }
      }
    })
    axiosMock.onGet('http://localhost/camps').networkError()

    vm.api.get('/camps')
    await letNetworkRequestFinish()
    const camps = vm.api.get('/camps')
    expect(camps).toBeInstanceOf(StoreValue)

    // when
    const load = camps.$loadItems()

    // then
    await letNetworkRequestFinish()
    const result = await load
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 123, _meta: { self: 'http://localhost/items/123' } })
    done()
  })

  it('does nothing when $loadItems is called on a loading entity', async done => {
    // given
    axiosMock.onGet('http://localhost/camps').replyOnce(200, {
      _embedded: {
        items: [{
          id: 123,
          _links: {
            self: {
              href: '/items/123'
            }
          }
        }]
      },
      _links: {
        self: {
          href: '/camps'
        }
      }
    })
    axiosMock.onGet('http://localhost/camps').networkError()

    const camps = vm.api.get('/camps')
    expect(camps).toBeInstanceOf(LoadingStoreValue)

    // when
    const load = camps.$loadItems()

    // then
    await letNetworkRequestFinish()
    const result = await load
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 123, _meta: { self: 'http://localhost/items/123' } })
    done()
  })

  it('loads the contents of an embedded collection', async done => {
    // given
    const userResponse = {
      id: 1,
      _embedded: {
        lastReadBook: {
          id: 555,
          _embedded: {
            chapters: [
              { _links: { self: { href: '/chapters/1028' } } },
              { _links: { self: { href: '/chapters/1031' } } },
              { _links: { self: { href: '/chapters/1038' } } }
            ]
          },
          _links: {
            self: {
              href: '/books/555'
            }
          }
        }
      },
      _links: {
        self: {
          href: '/users/1'
        }
      }
    }
    const chapter1Response = {
      id: 1028,
      name: 'The first chapter',
      _links: {
        self: {
          href: '/chapters/1028'
        }
      }
    }
    const chapter2Response = {
      id: 1028,
      name: 'The second chapter',
      _links: {
        self: {
          href: '/chapters/1031'
        }
      }
    }
    const chapter3Response = {
      id: 1028,
      name: 'The final chapter',
      _links: {
        self: {
          href: '/chapters/1038'
        }
      }
    }
    const bookResponse = {
      id: 555,
      _embedded: {
        chapters: [chapter1Response, chapter2Response, chapter3Response]
      },
      _links: {
        self: {
          href: '/books/555'
        }
      }
    }
    axiosMock.onGet('http://localhost/users/1').replyOnce(200, userResponse)
    axiosMock.onGet('http://localhost/books/555').replyOnce(200, bookResponse)

    vm.api.get('/users/1').lastReadBook().chapters()
    await letNetworkRequestFinish()
    const lastReadBookChapters = vm.api.get('/users/1').lastReadBook().chapters()
    expect(lastReadBookChapters).toBeInstanceOf(EmbeddedCollection)

    // when
    const load = lastReadBookChapters.$loadItems()

    // then
    await letNetworkRequestFinish()
    const result = await load
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({
      id: 1028,
      name: 'The first chapter',
      _meta: {
        self: 'http://localhost/chapters/1028'
      }
    })
    done()
  })

  it('loads the contents of a loading embedded collection', async done => {
    // given
    const userResponse = {
      id: 1,
      _embedded: {
        lastReadBook: {
          id: 555,
          _embedded: {
            chapters: [
              { _links: { self: { href: '/chapters/1028' } } },
              { _links: { self: { href: '/chapters/1031' } } },
              { _links: { self: { href: '/chapters/1038' } } }
            ]
          },
          _links: {
            self: {
              href: '/books/555'
            }
          }
        }
      },
      _links: {
        self: {
          href: '/users/1'
        }
      }
    }
    const chapter1Response = {
      id: 1028,
      name: 'The first chapter',
      _links: {
        self: {
          href: '/chapters/1028'
        }
      }
    }
    const chapter2Response = {
      id: 1028,
      name: 'The second chapter',
      _links: {
        self: {
          href: '/chapters/1031'
        }
      }
    }
    const chapter3Response = {
      id: 1028,
      name: 'The final chapter',
      _links: {
        self: {
          href: '/chapters/1038'
        }
      }
    }
    const bookResponse = {
      id: 555,
      _embedded: {
        chapters: [chapter1Response, chapter2Response, chapter3Response]
      },
      _links: {
        self: {
          href: '/books/555'
        }
      }
    }
    axiosMock.onGet('http://localhost/users/1').replyOnce(200, userResponse)
    axiosMock.onGet('http://localhost/books/555').replyOnce(200, bookResponse)

    const lastReadBookChapters = vm.api.get('/users/1').lastReadBook().chapters()
    expect(lastReadBookChapters).toBeInstanceOf(LoadingStoreValue)

    // when
    const load = lastReadBookChapters.$loadItems()

    // then
    await letNetworkRequestFinish()
    const result = await load
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({
      id: 1028,
      name: 'The first chapter',
      _meta: {
        self: 'http://localhost/chapters/1028'
      }
    })
    done()
  })
})
