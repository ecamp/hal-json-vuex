import { mount } from '@vue/test-utils'
import { HalJsonVuexPlugin } from '../src'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { vi } from 'vitest'
import { createStore } from 'vuex'
import embeddedSingleEntity from './resources/embedded-single-entity'
import linkedCollection from './resources/linked-collection'
import embeddedCollection from './resources/embedded-collection'
import templatedLink from './resources/templated-link'
import rootWithLink from './resources/root-with-link'
import Resource from '../src/Resource'
import LoadingResource from '../src/LoadingResource'

async function letNetworkRequestFinish () {
  await new Promise((resolve) => {
    setTimeout(() => resolve())
  })
}

let axiosMock
let store
let vm

describe('Using dollar methods', () => {
  beforeAll(() => {
    axios.defaults.baseURL = 'http://localhost'
  })

  beforeEach(() => {
    axiosMock = new MockAdapter(axios)

    store = createStore({})

    const installApi = {
      install (app) {
        const api = HalJsonVuexPlugin(store, axios, {
          forceRequestedSelfLink: true
        })
        app.use(api)
      }
    }

    const wrapper = mount({ template: '<div></div>' }, {
      global: {
        plugins: [
          store,
          installApi
        ]
      }
    })
    vm = wrapper.vm
  })

  afterEach(() => {
    axiosMock.restore()
  })

  it('$reloads entity and stores the response into the store', async () => {
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
    axiosMock
      .onGet('http://localhost/camps')
      .replyOnce(200, embeddedSingleEntity.serverResponse)

    vm.api.get('/camps')
    await letNetworkRequestFinish()
    const camps = vm.api.get('/camps')
    expect(camps).toBeInstanceOf(Resource)

    // when
    const load = camps.$reload()

    // then
    await letNetworkRequestFinish()
    expect(await load).toMatchObject({ id: 1, _meta: { self: '/camps' } })
  })

  it('does not $reload a loading entity', async () => {
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
    expect(camps).toBeInstanceOf(LoadingResource)

    // when
    const load = camps.$reload()

    // then
    await letNetworkRequestFinish()
    expect(await load).toMatchObject({ id: 2, _meta: { self: '/camps' } })
  })

  it('$reloads embedded collection', async () => {
    // given
    axiosMock.onGet('http://localhost/camps/1').replyOnce(200, {
      id: 1,
      _embedded: {
        periods: []
      },
      _links: {
        self: {
          href: '/camps/1'
        }
      }
    })
    axiosMock
      .onGet('http://localhost/camps/1')
      .replyOnce(200, embeddedCollection.serverResponse)

    vm.api.get('/camps/1')
    await letNetworkRequestFinish()
    const camp = vm.api.get('/camps/1')
    expect(camp).toBeInstanceOf(Resource)
    expect(camp.periods()).toBeInstanceOf(Resource)

    // when
    const load = camp.periods().$reload()

    // then
    await letNetworkRequestFinish()
    const periods = await load

    expect(periods.items.length).toEqual(2)
    expect(periods).toBeInstanceOf(Resource)
  })

  it('$posts entity and stores the response into the store', async () => {
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
    axiosMock
      .onPost('http://localhost/camps')
      .reply(200, embeddedSingleEntity.serverResponse)

    vm.api.get('/camps')
    await letNetworkRequestFinish()
    const camps = vm.api.get('/camps')
    expect(camps).toBeInstanceOf(Resource)

    // when
    const load = camps.$post({ some: 'thing' })

    // then
    await letNetworkRequestFinish()
    expect(await load).toMatchObject({ id: 1, _meta: { self: '/camps/1' } })
    expect(vm.api.get('/camps/1')).toMatchObject({
      id: 1,
      _meta: { self: '/camps/1' }
    })
    expect(vm.api.get('/campTypes/20')).toMatchObject({
      id: 20,
      name: 'camp',
      js: true,
      targetGroup: 'Kids',
      _meta: { self: '/campTypes/20' }
    })
  })

  it('$posts entity and handles response 204 "No Content" fine', async () => {
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
    axiosMock.onPost('http://localhost/camps').reply(204, undefined)

    vm.api.get('/camps')
    await letNetworkRequestFinish()
    const camps = vm.api.get('/camps')
    expect(camps).toBeInstanceOf(Resource)

    // when
    const load = camps.$post({ some: 'thing' })

    // then
    await letNetworkRequestFinish()
    expect(await load).toBeNull()
  })

  it('$posts onto loading entity and stores the response into the store', async () => {
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
    axiosMock
      .onPost('http://localhost/camps')
      .reply(200, embeddedSingleEntity.serverResponse)

    const camps = vm.api.get('/camps')
    expect(camps).toBeInstanceOf(LoadingResource)

    // when
    const load = camps.$post({ some: 'thing' })

    // then
    await letNetworkRequestFinish()
    expect(await load).toMatchObject({ id: 1, _meta: { self: '/camps/1' } })
    expect(vm.api.get('/camps/1')).toMatchObject({
      id: 1,
      _meta: { self: '/camps/1' }
    })
    expect(vm.api.get('/campTypes/20')).toMatchObject({
      id: 20,
      name: 'camp',
      js: true,
      targetGroup: 'Kids',
      _meta: { self: '/campTypes/20' }
    })
  })

  it('$patches entity and stores the response into the store', async () => {
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
    expect(camps).toBeInstanceOf(Resource)

    // when
    const load = camps.$patch({ some: 'thing' })

    // then
    await letNetworkRequestFinish()
    expect(await load).toMatchObject({
      some: 'thing',
      _meta: { self: '/camps' }
    })
  })

  it('$patches loading entity and stores the response into the store', async () => {
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
    expect(camps).toBeInstanceOf(LoadingResource)

    // when
    const load = camps.$patch({ some: 'thing' })

    // then
    await letNetworkRequestFinish()
    expect(await load).toMatchObject({
      some: 'thing',
      _meta: { self: '/camps' }
    })
  })

  it('$deletes entity and removes it from the store', async () => {
    // given
    axiosMock
      .onGet('http://localhost/camps/1')
      .replyOnce(200, embeddedSingleEntity.serverResponse)
    axiosMock.onGet('http://localhost/camps/1').reply(404)
    axiosMock.onDelete('http://localhost/camps/1').reply(204)

    vm.api.get('/camps/1')
    await letNetworkRequestFinish()
    const camp = vm.api.get('/camps/1')
    expect(camp).toBeInstanceOf(Resource)

    // when
    camp.$del()

    // then
    await letNetworkRequestFinish()
    expect(store.state.api).not.toHaveProperty('/camps/1')
  })

  it('$href returns a relation URI', async () => {
    // given
    axiosMock
      .onGet('http://localhost/camps/1')
      .reply(200, linkedCollection.serverResponse)

    vm.api.get('/camps/1')
    await letNetworkRequestFinish()
    const camp = vm.api.get('/camps/1')
    expect(camp).toBeInstanceOf(Resource)

    // when
    const hrefPromise = camp.$href('activities')

    // then
    await letNetworkRequestFinish()
    expect(hrefPromise).resolves.toEqual('/camps/1/activities')
  })

  it('$href returns a relation URI filled in with template parameters', async () => {
    // given
    axiosMock
      .onGet('http://localhost/camps/1')
      .reply(200, templatedLink.linkingServerResponse)

    vm.api.get('/camps/1')
    await letNetworkRequestFinish()
    const camp = vm.api.get('/camps/1')
    expect(camp).toBeInstanceOf(Resource)

    // when
    const hrefPromise = camp.$href('users', { id: 999 })

    // then
    await letNetworkRequestFinish()
    expect(hrefPromise).resolves.toEqual('/camps/1/users/999')
  })

  it('$href also works on the root API endpoint', async () => {
    // given
    axiosMock
      .onGet('http://localhost/')
      .reply(200, rootWithLink.serverResponse)

    vm.api.get()
    await letNetworkRequestFinish()
    const root = vm.api.get()
    expect(root).toBeInstanceOf(Resource)

    // when
    const hrefPromise = root.$href('books')

    // then
    await letNetworkRequestFinish()
    expect(hrefPromise).resolves.toEqual('/books')
  })

  it('$deletes loading entity and removes it from the store', async () => {
    // given
    axiosMock
      .onGet('http://localhost/camps/1')
      .replyOnce(200, embeddedSingleEntity.serverResponse)
    axiosMock.onGet('http://localhost/camps/1').reply(404)
    axiosMock.onDelete('http://localhost/camps/1').reply(204)

    const camp = vm.api.get('/camps/1')
    expect(camp).toBeInstanceOf(LoadingResource)

    // when
    camp.$del()

    // then
    await letNetworkRequestFinish()
    expect(store.state.api).not.toHaveProperty('/camps/1')
  })

  it('does nothing when $loadItems is called on an entity', async () => {
    // given
    axiosMock.onGet('http://localhost/camps').replyOnce(200, {
      _embedded: {
        items: [
          {
            id: 123,
            _links: {
              self: {
                href: '/items/123'
              }
            }
          }
        ]
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
    expect(camps).toBeInstanceOf(Resource)

    // when
    const load = camps.$loadItems()

    // then
    await letNetworkRequestFinish()
    const result = (await load).items
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 123, _meta: { self: '/items/123' } })
  })

  it('does nothing when $loadItems is called on a loading entity', async () => {
    // given
    axiosMock.onGet('http://localhost/camps').replyOnce(200, {
      _embedded: {
        items: [
          {
            id: 123,
            _links: {
              self: {
                href: '/items/123'
              }
            }
          }
        ]
      },
      _links: {
        self: {
          href: '/camps'
        }
      }
    })
    axiosMock.onGet('http://localhost/camps').networkError()

    const camps = vm.api.get('/camps')
    expect(camps).toBeInstanceOf(LoadingResource)

    // when
    const load = camps.$loadItems()

    // then
    await letNetworkRequestFinish()
    const result = (await load).items
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 123, _meta: { self: '/items/123' } })
  })

  it('does throw when $loadItems is called on a non-collection entity', async () => {
    // given
    const userResponse = {
      id: 2,
      _links: {
        self: {
          href: '/users/2'
        }
      }
    }
    axiosMock.onGet('http://localhost/users/2').replyOnce(200, userResponse)

    const user = vm.api.get('/users/2')
    expect(user).toBeInstanceOf(LoadingResource)

    // then
    expect(user.$loadItems()).rejects.toThrow('This LoadingResource is not a collection')
    await letNetworkRequestFinish()
  })

  it('loads the contents of an embedded collection', async () => {
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
    const lastReadBookChapters = vm.api
      .get('/users/1')
      .lastReadBook()
      .chapters()
    expect(lastReadBookChapters).toBeInstanceOf(Resource)

    // when
    const load = lastReadBookChapters.$loadItems()

    // then
    await letNetworkRequestFinish()
    const result = (await load).items
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({
      id: 1028,
      name: 'The first chapter',
      _meta: {
        self: '/chapters/1028'
      }
    })
  })

  it('loads the contents of a loading embedded collection', async () => {
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
      id: 1031,
      name: 'The second chapter',
      _links: {
        self: {
          href: '/chapters/1031'
        }
      }
    }
    const chapter3Response = {
      id: 1038,
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

    const lastReadBookChapters = vm.api
      .get('/users/1')
      .lastReadBook()
      .chapters()
    expect(lastReadBookChapters).toBeInstanceOf(LoadingResource)

    // when
    const load = lastReadBookChapters.$loadItems()

    // then
    await letNetworkRequestFinish()
    const result = (await load).items
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({
      id: 1028,
      name: 'The first chapter',
      _meta: {
        self: '/chapters/1028'
      }
    })
  })

  it('provides find array function on loading embedded collections', async () => {
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
      id: 1031,
      name: 'The second chapter',
      _links: {
        self: {
          href: '/chapters/1031'
        }
      }
    }
    const chapter3Response = {
      id: 1038,
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

    const lastReadBookChapters = vm.api
      .get('/users/1')
      .lastReadBook()
      .chapters()
    expect(lastReadBookChapters).toBeInstanceOf(LoadingResource)

    // when
    const items = lastReadBookChapters.items

    // then

    const spy = vi.fn().mockImplementation(({ id }) => id === 1028)
    items.find((item) => spy(item))

    expect(spy).not.toHaveBeenCalled()
    await letNetworkRequestFinish()
    expect(spy).toHaveBeenCalled()
  })

  it('provides filter array function on loading embedded collections', async () => {
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
      id: 1031,
      name: 'The second chapter',
      _links: {
        self: {
          href: '/chapters/1031'
        }
      }
    }
    const chapter3Response = {
      id: 1038,
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

    const lastReadBookChapters = vm.api
      .get('/users/1')
      .lastReadBook()
      .chapters()
    expect(lastReadBookChapters).toBeInstanceOf(LoadingResource)

    // when
    const items = lastReadBookChapters.items

    // then

    const spy = vi.fn().mockImplementation(({ id }) => id === 1028)
    items.filter((item) => spy(item))

    expect(spy).not.toHaveBeenCalled()
    await letNetworkRequestFinish()
    expect(spy).toHaveBeenCalled()
  })

  it('throws error when deleting virtual resource', async () => {
    // given
    axiosMock
      .onGet('http://localhost/camps/1')
      .replyOnce(200, embeddedCollection.serverResponse)
    const camp = await vm.api.get('/camps/1')._meta.load
    await letNetworkRequestFinish()

    // when
    await expect(camp.periods().$del())
      // then
      .rejects.toThrow('del is not implemented for virtual resources')
  })

  it('throws error when posting on virtual resource', async () => {
    // given
    axiosMock
      .onGet('http://localhost/camps/1')
      .replyOnce(200, embeddedCollection.serverResponse)
    const camp = await vm.api.get('/camps/1')._meta.load
    await letNetworkRequestFinish()

    // when
    await expect(camp.periods().$post({}))
      // then
      .rejects.toThrow('post is not implemented for virtual resources')
  })

  it('throws error when patching an virtual resource', async () => {
    // given
    axiosMock
      .onGet('http://localhost/camps/1')
      .replyOnce(200, embeddedCollection.serverResponse)
    const camp = await vm.api.get('/camps/1')._meta.load
    await letNetworkRequestFinish()

    // when
    await expect(camp.periods().$patch([]))
      // then
      .rejects.toThrow('patch is not implemented for virtual resources')
  })

  it('throws error when posting an invalid input', async () => {
    // when
    await expect(vm.api.post(42))
      // then
      .rejects.toThrow('Could not perform POST, "42" is not an entity or URI')
    await letNetworkRequestFinish()
  })

  it('throws error when reloading an invalid input', async () => {
    // when
    await expect(vm.api.reload(42))
      // then
      .rejects.toThrow('Could not perform reload, "42" is not an entity or URI')
    await letNetworkRequestFinish()
  })

  it('throws error when patching an invalid input', async () => {
    // when
    await expect(vm.api.patch(42))
      // then
      .rejects.toThrow('Could not perform PATCH, "42" is not an entity or URI')
    await letNetworkRequestFinish()
  })

  it('throws error when deleting an invalid input', async () => {
    // when
    await expect(vm.api.del(42))
      // then
      .rejects.toThrow('Could not perform DELETE, "42" is not an entity or URI')
    await letNetworkRequestFinish()
  })

  it('throws error when posting fails', async () => {
    // given
    axiosMock
      .onGet('http://localhost/camps/1')
      .replyOnce(404)
    // when
    await expect(vm.api.post('/camp/1', { id: 0 }))
      // then
      .rejects.toThrow('Could not post to "/camp/1" (status 404): Request failed with status code 404')
    await letNetworkRequestFinish()
  })
})
