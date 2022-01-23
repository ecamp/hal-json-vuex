import { createLocalVue, mount } from '@vue/test-utils'
import HalJsonVuex from '../src'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import VueAxios from 'vue-axios'
import Vuex from 'vuex'
import Vue from 'vue'
import { cloneDeep } from 'lodash'
import embeddedSingleEntity from './resources/embedded-single-entity'
import referenceToSingleEntity from './resources/reference-to-single-entity'
import embeddedCollection from './resources/embedded-collection'
import embeddedCollectionStandaloneLink from './resources/embedded-collection-standalone-link'
import embeddedCollectionLinkArray from './resources/embedded-collection-link-array'
import linkedSingleEntity from './resources/linked-single-entity'
import linkedCollection from './resources/linked-collection'
import linkedEntityArray from './resources/linked-entity-array'
import collectionFirstPage from './resources/collection-firstPage'
import collectionPage1 from './resources/collection-page1'
import circularReference from './resources/circular-reference'
import multipleReferencesToUser from './resources/multiple-references-to-user'
import templatedLink from './resources/templated-link'
import objectProperty from './resources/object-property'
import arrayProperty from './resources/array-property'
import root from './resources/root'

import LoadingStoreValue from '../src/LoadingStoreValue'
import StoreValue from '../src/StoreValue'

async function letNetworkRequestFinish () {
  await new Promise(resolve => {
    setTimeout(() => resolve())
  })
}

let axiosMock
let store
let vm
let stateCopy

describe('API store', () => {
  ([true, false]).forEach(avoidNPlusOneRequests => {
    const title = avoidNPlusOneRequests ? 'avoiding n+1 queries' : 'not avoiding n+1 queries'
    describe(title, () => {
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
        localVue.use(HalJsonVuex(store, axios, { forceRequestedSelfLink: true, avoidNPlusOneRequests }))
        const wrapper = mount({ store, template: '<div></div>' }, { localVue })
        vm = wrapper.vm
      })

      afterEach(() => {
        axiosMock.restore()
      })

      it('loads the API root', async () => {
        // given
        axiosMock.onGet('http://localhost/').reply(200, root.serverResponse)

        // when
        vm.api.get()

        // then
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).toMatchObject(root.storeState)
      })

      it('can serialize StoreValue object', async done => {
        // given
        axiosMock.onGet('http://localhost/').reply(200, root.serverResponse)

        // when
        const loadingObject = vm.api.get()

        // then (loading)
        expect(loadingObject).toBeInstanceOf(LoadingStoreValue)
        expect(loadingObject.toJSON()).toEqual('{}')

        // then (loaded)
        const loadedObject = await loadingObject._meta.load
        expect(loadedObject).toBeInstanceOf(StoreValue)
        expect(loadedObject.toJSON()).toEqual('{"this":"is","the":"root","_meta":{"self":"","loading":false,"reloading":false,"load":"{}"}}')
        done()
      })

      it('imports embedded single entity', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, embeddedSingleEntity.serverResponse)

        // when
        vm.api.get('/camps/1')

        // then
        expect(vm.$store.state.api).toMatchObject({ '/camps/1': { _meta: { self: '/camps/1', loading: true } } })
        expect(vm.api.get('/camps/1').campType().name.toString()).toEqual('')
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).toMatchObject(embeddedSingleEntity.storeState)
        expect(vm.api.get('/camps/1')._meta.self).toEqual('http://localhost/camps/1')
        expect(vm.api.get('/camps/1').campType()._meta.self).toEqual('http://localhost/campTypes/20')
        expect(vm.api.get('/campTypes/20')._meta.self).toEqual('http://localhost/campTypes/20')
        expect(vm.api.get('/camps/1').campType().name.toString()).toEqual('camp')
      })

      it('imports reference to single entity', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, referenceToSingleEntity.serverResponse)

        // when
        vm.api.get('/camps/1')

        // then
        expect(vm.$store.state.api).toMatchObject({ '/camps/1': { _meta: { self: '/camps/1', loading: true } } })
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).toMatchObject(referenceToSingleEntity.storeState)
        expect(vm.api.get('/camps/1')._meta.self).toEqual('http://localhost/camps/1')
      })

      it('imports embedded collection', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, embeddedCollection.serverResponse)

        // when
        vm.api.get('/camps/1')

        // then
        expect(vm.$store.state.api).toMatchObject({ '/camps/1': { _meta: { self: '/camps/1', loading: true } } })
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).toMatchObject(embeddedCollection.storeState)
        expect(vm.api.get('/camps/1')._meta.self).toEqual('http://localhost/camps/1')
        expect(vm.api.get('/camps/1').periods().items[0]._meta.self).toEqual('http://localhost/periods/104')
        expect(vm.api.get('/camps/1').periods().items[1]._meta.self).toEqual('http://localhost/periods/128')
        expect(vm.api.get('/periods/104')._meta.self).toEqual('http://localhost/periods/104')
        expect(vm.api.get('/periods/104').camp()._meta.self).toEqual('http://localhost/camps/1')
        expect(vm.api.get('/periods/128')._meta.self).toEqual('http://localhost/periods/128')
        expect(vm.api.get('/periods/128').camp()._meta.self).toEqual('http://localhost/camps/1')
      })

      it('imports empty embedded collection', async () => {
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

        // when
        vm.api.get('/camps/1')
        await letNetworkRequestFinish()

        // then
        // expect(vm.api.get('/camps/1').periods()._meta.loading).toEqual(false) // TODO: Should embedded collections get a loading property?
        expect(vm.api.get('/camps/1').periods().items).toEqual([])
      })

      it('imports embedded collection with standalone link', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, embeddedCollectionStandaloneLink.serverResponse)

        // when
        vm.api.get('/camps/1')

        // then
        expect(vm.$store.state.api).toMatchObject({ '/camps/1': { _meta: { self: '/camps/1', loading: true } } })
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).toMatchObject(embeddedCollectionStandaloneLink.storeState)
        expect(vm.api.get('/camps/1')._meta.self).toEqual('http://localhost/camps/1')
        expect(vm.api.get('/camps/1').periods().items[0]._meta.self).toEqual('http://localhost/periods/104')
        expect(vm.api.get('/camps/1').periods().items[1]._meta.self).toEqual('http://localhost/periods/128')
        expect(vm.api.get('/periods/104')._meta.self).toEqual('http://localhost/periods/104')
        expect(vm.api.get('/periods/104').camp()._meta.self).toEqual('http://localhost/camps/1')
        expect(vm.api.get('/periods/128')._meta.self).toEqual('http://localhost/periods/128')
        expect(vm.api.get('/periods/128').camp()._meta.self).toEqual('http://localhost/camps/1')
      })

      it('imports embedded collection with link array', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, embeddedCollectionLinkArray.serverResponse)

        // when
        vm.api.get('/camps/1')

        // then
        expect(vm.$store.state.api).toMatchObject({ '/camps/1': { _meta: { self: '/camps/1', loading: true } } })
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).toMatchObject(embeddedCollectionLinkArray.storeState)
        expect(vm.api.get('/camps/1')._meta.self).toEqual('http://localhost/camps/1')
        expect(vm.api.get('/camps/1').periods().items[0]._meta.self).toEqual('http://localhost/periods/104')
        expect(vm.api.get('/camps/1').periods().items[1]._meta.self).toEqual('http://localhost/periods/128')
        expect(vm.api.get('/periods/104')._meta.self).toEqual('http://localhost/periods/104')
        expect(vm.api.get('/periods/104').camp()._meta.self).toEqual('http://localhost/camps/1')
        expect(vm.api.get('/periods/128')._meta.self).toEqual('http://localhost/periods/128')
        expect(vm.api.get('/periods/128').camp()._meta.self).toEqual('http://localhost/camps/1')
      })

      it('imports linked single entity', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, linkedSingleEntity.serverResponse)
        const mainLeader = {
          serverResponse: { id: 83, name: 'Smiley', _links: { self: { href: '/users/83' } } },
          storeState: { id: 83, name: 'Smiley', _meta: { self: '/users/83' } }
        }
        axiosMock.onGet('http://localhost/users/83').reply(200, mainLeader.serverResponse)

        // when
        vm.api.get('/camps/1')

        // then
        expect(vm.$store.state.api).toMatchObject({ '/camps/1': { _meta: { self: '/camps/1', loading: true } } })
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).toMatchObject(linkedSingleEntity.storeState)
        expect(vm.api.get('/camps/1')._meta.self).toEqual('http://localhost/camps/1')
        // expect(vm.api.get('/camps/1').main_leader()._meta.self).toEqual('http://localhost/users/83')
        expect(vm.api.get('/camps/1').main_leader()._meta.loading).toEqual(true)
        await letNetworkRequestFinish()
        expect(vm.api.get('/camps/1').main_leader()._meta).toMatchObject({ self: 'http://localhost/users/83' })
        expect(vm.api.get('/users/83')._meta.self).toEqual('http://localhost/users/83')
      })

      it('imports linked entity array', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, linkedEntityArray.serverResponse)

        const activity1 = {
          serverResponse: { id: 1, title: 'LS Volleyball', _links: { self: { href: '/activities/1' } } },
          storeState: { id: 1, title: 'LS Volleyball', _meta: { self: '/activities/1' } }
        }
        axiosMock.onGet('http://localhost/activities/1').reply(200, activity1.serverResponse)

        const activity2 = {
          serverResponse: { id: 2, title: 'LA Blachen', _links: { self: { href: '/activities/2' } } },
          storeState: { id: 2, title: 'LA Blachen', _meta: { self: '/activities/2' } }
        }
        axiosMock.onGet('http://localhost/activities/2').reply(200, activity2.serverResponse)

        // when
        vm.api.get('/camps/1')

        // then
        expect(vm.$store.state.api).toMatchObject({ '/camps/1': { _meta: { self: '/camps/1', loading: true } } })
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).toMatchObject(linkedEntityArray.storeState)

        expect(vm.api.get('/camps/1').activities().items).toBeInstanceOf(Array)
        /*
        expect(vm.api.get('/camps/1').activities().items.length).toEqual(2)
        expect(vm.api.get('/camps/1').activities().items[0]._meta.self).toEqual('http://localhost/activities/1')
        expect(vm.api.get('/camps/1').activities().items[1]._meta.self).toEqual('http://localhost/activities/2') */

        await letNetworkRequestFinish()

        expect(vm.$store.state.api['/activities/1']).toMatchObject(activity1.storeState)
        expect(vm.$store.state.api['/activities/2']).toMatchObject(activity2.storeState)
        expect(vm.api.get('/camps/1').activities().items.length).toEqual(2)
        expect(vm.api.get('/camps/1').activities().items[0].title).toEqual('LS Volleyball')
        expect(vm.api.get('/camps/1').activities().items[1].title).toEqual('LA Blachen')
      })

      it('imports paginatable collection', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, linkedCollection.serverResponse)
        const activities = {
          serverResponse: {
            _embedded: {
              items: [
                { id: 1234, title: 'LS Volleyball', _links: { self: { href: '/activities/1234' } } },
                { id: 1236, title: 'LA Blachen', _links: { self: { href: '/activities/1236' } } }
              ]
            },
            _links: { self: { href: '/camps/1/activities' }, first: { href: '/camps/1/activities' } },
            _page: 0,
            _per_page: -1,
            _total: 2,
            page_count: 1
          },
          storeState: {
            items: [
              {
                href: '/activities/1234'
              },
              {
                href: '/activities/1236'
              }
            ],
            first: {
              href: '/camps/1/activities'
            },
            _page: 0,
            _per_page: -1,
            _total: 2,
            page_count: 1,
            _meta: {
              self: '/camps/1/activities'
            }
          }
        }
        axiosMock.onGet('http://localhost/camps/1/activities').reply(200, activities.serverResponse)

        // when
        vm.api.get('/camps/1')

        // then
        expect(vm.$store.state.api).toMatchObject({ '/camps/1': { _meta: { self: '/camps/1', loading: true } } })
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).toMatchObject(linkedCollection.storeState)
        expect(vm.api.get('/camps/1').activities().items).toBeInstanceOf(Array)
        expect(vm.api.get('/camps/1').activities().items.length).toEqual(0)
        await letNetworkRequestFinish()
        expect(vm.$store.state.api['/camps/1/activities']).toMatchObject(activities.storeState)
        expect(vm.api.get('/camps/1').activities().items.length).toEqual(2)
        expect(vm.api.get('/camps/1').activities().items[0]._meta.self).toEqual('http://localhost/activities/1234')
        expect(vm.api.get('/camps/1').activities().items[1]._meta.self).toEqual('http://localhost/activities/1236')
      })

      it('imports paginatable collection with multiple pages', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1/activities?page=0&page_size=2').reply(200, collectionFirstPage.serverResponse)
        axiosMock.onGet('http://localhost/camps/1/activities?page=1&page_size=2').reply(200, collectionPage1.serverResponse)

        // when
        vm.api.get('/camps/1/activities?page_size=2&page=0')

        // then
        expect(vm.$store.state.api).toMatchObject({
          '/camps/1/activities?page=0&page_size=2': {
            _meta: {
              self: '/camps/1/activities?page=0&page_size=2',
              loading: true
            }
          }
        })
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).toMatchObject(collectionFirstPage.storeState)
        expect(vm.api.get('/camps/1/activities?page_size=2&page=0').items.length).toEqual(2)

        // when
        vm.api.get('/camps/1/activities?page_size=2&page=1')

        // then
        expect(vm.$store.state.api).toMatchObject({
          ...collectionFirstPage.storeState,
          '/camps/1/activities?page=1&page_size=2': {
            _meta: {
              self: '/camps/1/activities?page=1&page_size=2',
              loading: true
            }
          }
        })
        expect(vm.api.get('/camps/1/activities?page_size=2&page=0').items.length).toEqual(2)
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).toMatchObject({ ...collectionFirstPage.storeState, ...collectionPage1.storeState })
        expect(vm.api.get('/camps/1/activities?page_size=2&page=0').items.length).toEqual(2)
        expect(vm.api.get('/camps/1/activities?page_size=2&page=1').items.length).toEqual(1)
      })

      it('allows redundantly using get with an object', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, embeddedSingleEntity.serverResponse)

        // when
        vm.api.get({ _meta: { self: '/camps/1' } })

        // then
        expect(vm.$store.state.api).toMatchObject({ '/camps/1': { _meta: { self: '/camps/1', loading: true } } })
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).toMatchObject(embeddedSingleEntity.storeState)
      })

      it('allows using get with a loading object with known URI', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, embeddedSingleEntity.serverResponse)
        const loadingObject = vm.api.get('/camps/1')

        // when
        vm.api.get(loadingObject)

        // then
        expect(vm.$store.state.api).toMatchObject({ '/camps/1': { _meta: { self: '/camps/1', loading: true } } })
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).toMatchObject(embeddedSingleEntity.storeState)
      })

      it('allows using get with a loading object with unknown URI', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, embeddedSingleEntity.serverResponse)
        const loadingObject = vm.api.get('/camps/1').campType()

        // when
        vm.api.get(loadingObject)

        // then
        expect(vm.$store.state.api).toMatchObject({ '/camps/1': { _meta: { self: '/camps/1', loading: true } } })
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).toMatchObject(embeddedSingleEntity.storeState)
      })

      it('allows accessing _meta in a loading object with unknown URI', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, embeddedSingleEntity.serverResponse)
        const loadingObject = vm.api.get('/camps/1').campType()

        // when
        const meta = vm.api.get(loadingObject)._meta

        // then
        expect(meta.loading).toEqual(true)
        expect(meta.self).toEqual(null)
      })

      it('returns the correct object when awaiting._meta.load on a LoadingStoreValue', async done => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, embeddedSingleEntity.serverResponse)
        const loadingStoreValue = vm.api.get('/camps/1')
        expect(loadingStoreValue).toBeInstanceOf(vm.api.LoadingStoreValue)

        // when
        loadingStoreValue._meta.load.then(loadedData => {
          // then
          expect(loadedData).toMatchObject({ id: 1, _meta: { self: 'http://localhost/camps/1' } })

          done()
        })

        letNetworkRequestFinish()
      })

      it('returns the correct object when awaiting._meta.load on a loaded object', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, embeddedSingleEntity.serverResponse)
        vm.api.get('/camps/1')
        await letNetworkRequestFinish()
        const camp = vm.api.get('/camps/1')
        expect(camp).not.toBeInstanceOf(vm.api.LoadingStoreValue)

        // when
        const loadedData = await camp._meta.load

        // then
        expect(loadedData).toMatchObject({ id: 1, _meta: { self: 'http://localhost/camps/1' } })
      })

      it('returns the correct load promise when reloading an object', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').replyOnce(200, {
          id: 1,
          _links: {
            self: {
              href: '/camps/1'
            }
          }
        })
        axiosMock.onGet('http://localhost/camps/1').reply(200, {
          id: 2,
          _links: {
            self: {
              href: '/camps/1'
            }
          }
        })
        const camp = vm.api.get('/camps/1')
        await letNetworkRequestFinish()

        // when
        const load = vm.api.reload(camp)

        // then
        await letNetworkRequestFinish()
        const result = await load
        expect(result).toMatchObject({ id: 2, _meta: { self: 'http://localhost/camps/1' } })
      })

      it('returns the correct load promise when prematurely reloading an object', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').replyOnce(200, {
          id: 1,
          _links: {
            self: {
              href: '/camps/1'
            }
          }
        })
        axiosMock.onGet('http://localhost/camps/1').reply(200, {
          id: 2,
          _links: {
            self: {
              href: '/camps/1'
            }
          }
        })

        // when
        const load = vm.api.reload(vm.api.get('/camps/1'))

        // then
        await letNetworkRequestFinish()
        const result = await load
        expect(result).toMatchObject({ id: 1, _meta: { self: 'http://localhost/camps/1' } })
      })

      it('returns the correct load promise when getting an object that is currently reloading', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').replyOnce(200, {
          id: 1,
          _links: {
            self: {
              href: '/camps/1'
            }
          }
        })
        axiosMock.onGet('http://localhost/camps/1').replyOnce(200, {
          id: 2,
          _links: {
            self: {
              href: '/camps/1'
            }
          }
        })
        axiosMock.onGet('http://localhost/camps/1').replyOnce(200, {
          id: 3,
          _links: {
            self: {
              href: '/camps/1'
            }
          }
        })
        const loaded = vm.api.get('/camps/1')
        await letNetworkRequestFinish()
        vm.api.reload(loaded)

        // when
        const load = vm.api.get(loaded)._meta.load

        // then
        await letNetworkRequestFinish()
        const result = await load
        expect(result).toMatchObject({ id: 2, _meta: { self: 'http://localhost/camps/1' } })
      })

      it('refuses to send out the same reload request again before the ongoing one has completed', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').replyOnce(200, {
          id: 1,
          _links: {
            self: {
              href: '/camps/1'
            }
          }
        })
        axiosMock.onGet('http://localhost/camps/1').replyOnce(200, {
          id: 2,
          _links: {
            self: {
              href: '/camps/1'
            }
          }
        })
        axiosMock.onGet('http://localhost/camps/1').replyOnce(200, {
          id: 3,
          _links: {
            self: {
              href: '/camps/1'
            }
          }
        })
        const loaded = vm.api.get('/camps/1')
        await letNetworkRequestFinish()
        vm.api.reload(loaded)

        // when
        const load = vm.api.reload(loaded)

        // then
        await letNetworkRequestFinish()
        const result = await load
        expect(result).toMatchObject({ id: 2, _meta: { self: 'http://localhost/camps/1' } })
      })

      it('throws when trying to access _meta in an invalid object', () => {
        // given

        // when
        expect(() => vm.api.get({})._meta)

        // then
          .toThrow(Error)
      })

      it('purges and later re-fetches a URI from the store', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, embeddedSingleEntity.serverResponse)
        axiosMock.onGet('http://localhost/campTypes/20').reply(200, embeddedSingleEntity.serverResponse._embedded.campType)
        vm.api.get('/camps/1')
        await letNetworkRequestFinish()
        const storeStateWithoutCampType = cloneDeep(embeddedSingleEntity.storeState)
        delete storeStateWithoutCampType['/campTypes/20']

        // when
        vm.api.purge('/campTypes/20')

        // then
        expect(vm.$store.state.api).toMatchObject(storeStateWithoutCampType)
        expect(vm.api.get('/camps/1').campType()._meta.loading).toEqual(true)
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).toMatchObject(embeddedSingleEntity.storeState)
      })

      it('purges and later re-fetches an object from the store', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, embeddedSingleEntity.serverResponse)
        axiosMock.onGet('http://localhost/campTypes/20').reply(200, embeddedSingleEntity.serverResponse._embedded.campType)
        vm.api.get('/camps/1')
        await letNetworkRequestFinish()
        const campType = vm.api.get('/camps/1').campType()
        const storeStateWithoutCampType = cloneDeep(embeddedSingleEntity.storeState)
        delete storeStateWithoutCampType['/campTypes/20']

        // when
        vm.api.purge(campType)

        // then
        expect(vm.$store.state.api).toMatchObject(storeStateWithoutCampType)
        expect(vm.api.get('/camps/1').campType()._meta.loading).toEqual(true)
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).toMatchObject(embeddedSingleEntity.storeState)
      })

      it('reloads a URI from the store', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, embeddedSingleEntity.serverResponse)
        const campType = {
          serverResponse: {
            id: 20,
            name: 'Nicht-J+S-Lager',
            js: false,
            targetGroup: 'Teens',
            _links: {
              self: {
                href: '/campTypes/20'
              }
            }
          },
          storeState: {
            id: 20,
            name: 'Nicht-J+S-Lager',
            js: false,
            targetGroup: 'Teens',
            _meta: {
              self: '/campTypes/20'
            }
          }
        }
        axiosMock.onGet('http://localhost/campTypes/20').reply(200, campType.serverResponse)
        vm.api.get('/camps/1')
        await letNetworkRequestFinish()

        // when
        vm.api.reload('/campTypes/20')

        // then
        expect(vm.$store.state.api).toMatchObject(embeddedSingleEntity.storeState)
        await letNetworkRequestFinish()
        expect(vm.$store.state.api['/campTypes/20']).toMatchObject(campType.storeState)
      })

      it('reloads an object from the store', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, embeddedSingleEntity.serverResponse)
        const campTypeData = {
          serverResponse: {
            id: 20,
            name: 'Nicht-J+S-Lager',
            js: false,
            targetGroup: 'Teens',
            _links: {
              self: {
                href: '/campTypes/20'
              }
            }
          },
          storeState: {
            id: 20,
            name: 'Nicht-J+S-Lager',
            js: false,
            targetGroup: 'Teens',
            _meta: {
              self: '/campTypes/20'
            }
          }
        }
        axiosMock.onGet('http://localhost/campTypes/20').reply(200, campTypeData.serverResponse)
        vm.api.get('/camps/1').campType()
        await letNetworkRequestFinish()
        const campType = vm.api.get('/camps/1').campType()

        // when
        vm.api.reload(campType)

        // then
        expect(vm.$store.state.api).toMatchObject(embeddedSingleEntity.storeState)
        await letNetworkRequestFinish()
        expect(vm.$store.state.api['/campTypes/20']).toMatchObject(campTypeData.storeState)
      })

      it('reloads an embedded collection from the store by reloading the superordinate object', async () => {
        // given
        const campData = {
          serverResponse: {
            id: 20,
            _embedded: {
              activityTypes: [
                {
                  id: 123,
                  name: 'LS',
                  _links: {
                    self: {
                      href: '/activityTypes/123'
                    }
                  }
                },
                {
                  id: 124,
                  name: 'LP',
                  _links: {
                    self: {
                      href: '/activityTypes/124'
                    }
                  }
                }
              ]
            },
            _links: {
              self: {
                href: '/campTypes/20'
              }
            }
          },
          serverResponse2: {
            id: 20,
            _embedded: {
              activityTypes: [
                {
                  id: 123,
                  name: 'LS',
                  _links: {
                    self: {
                      href: '/activityTypes/123'
                    }
                  }
                }
              ]
            },
            _links: {
              self: {
                href: '/campTypes/20'
              }
            }
          },
          storeState: [
            {
              href: '/activityTypes/123'
            }
          ]
        }
        axiosMock.onGet('http://localhost/camps/1').replyOnce(200, campData.serverResponse)
        axiosMock.onGet('http://localhost/camps/1').replyOnce(200, campData.serverResponse2)
        vm.api.get('/camps/1').activityTypes()
        await letNetworkRequestFinish()
        const embeddedCollection = vm.api.get('/camps/1').activityTypes()

        // when
        vm.api.reload(embeddedCollection)

        // then
        expect(embeddedCollection._meta.self).toBeUndefined()
        await letNetworkRequestFinish()
        expect(vm.$store.state.api['/camps/1#activityTypes'].items).toMatchObject(campData.storeState)
      })

      it('reloads a linked collection without standalone link from the store by reloading the superordinate object', async () => {
        // given
        const campServerResponse1 = {
          id: 20,
          _links: {
            self: {
              href: '/campTypes/20'
            },
            activityTypes: [
              { href: '/activityTypes/123' },
              { href: '/activityTypes/124' }
            ]
          }
        }

        const campServerResponse2 = {
          id: 20,
          _links: {
            self: {
              href: '/campTypes/20'
            },
            activityTypes: [
              { href: '/activityTypes/125' }
            ]
          }
        }

        const activityTypeStoreState = [
          {
            href: '/activityTypes/125'
          }
        ]

        axiosMock.onGet('http://localhost/camps/1').replyOnce(200, campServerResponse1)
        axiosMock.onGet('http://localhost/camps/1').replyOnce(200, campServerResponse2)
        vm.api.get('/camps/1').activityTypes()
        await letNetworkRequestFinish()
        const embeddedCollection = vm.api.get('/camps/1').activityTypes()

        // when
        vm.api.reload(embeddedCollection)

        // then
        expect(embeddedCollection._meta.self).toBeUndefined()
        await letNetworkRequestFinish()
        expect(vm.$store.state.api['/camps/1#activityTypes'].items).toMatchObject(activityTypeStoreState)
      })

      it('loads the contents of an embedded collection depending on the avoidNPlusOneQueries flag', async () => {
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

        const lastReadBookChapters = vm.api.get('/users/1').lastReadBook().chapters()
        await letNetworkRequestFinish()

        if (avoidNPlusOneRequests) {
          axiosMock.onGet('http://localhost/books/555').replyOnce(200, bookResponse)
        } else {
          axiosMock.onGet('http://localhost/chapters/1028').replyOnce(200, chapter1Response)
          axiosMock.onGet('http://localhost/chapters/1031').replyOnce(200, chapter2Response)
          axiosMock.onGet('http://localhost/chapters/1038').replyOnce(200, chapter3Response)
        }

        // when
        const result = lastReadBookChapters.items

        // then
        await letNetworkRequestFinish()
        // expect no errors
      })

      if (avoidNPlusOneRequests) {
        it('falls back to loading each entry individually if the parent of the embedded collection doesn\'t return the collection element data', async () => {
          // given
          const bookResponse = {
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
          const userResponse = {
            id: 1,
            _embedded: {
              lastReadBook: bookResponse
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
          axiosMock.onGet('http://localhost/users/1').replyOnce(200, userResponse)

          const lastReadBookChapters = vm.api.get('/users/1').lastReadBook().chapters()
          await letNetworkRequestFinish()

          axiosMock.onGet('http://localhost/books/555').replyOnce(200, bookResponse)
          axiosMock.onGet('http://localhost/chapters/1028').replyOnce(200, chapter1Response)
          axiosMock.onGet('http://localhost/chapters/1031').replyOnce(200, chapter2Response)
          axiosMock.onGet('http://localhost/chapters/1038').replyOnce(200, chapter3Response)

          // when
          const result = lastReadBookChapters.items

          // then
          await letNetworkRequestFinish()
          // expect no errors
        })
      }

      it('deletes an URI from the store and reloads all entities referencing it', async () => {
        // given
        axiosMock.onGet('http://localhost/groups/99').replyOnce(200, multipleReferencesToUser)
        axiosMock.onGet('http://localhost/groups/99').reply(200, {
          id: 99,
          name: 'Pfadi Züri',
          _links: {
            self: {
              href: '/groups/99'
            }
          }
        })
        axiosMock.onGet('http://localhost/camps/123').reply(200, {
          id: 123,
          _links: {
            self: {
              href: '/camps/123'
            }
          }
        })
        axiosMock.onDelete('http://localhost/users/1').replyOnce(204)
        vm.api.get('/groups/99')
        await letNetworkRequestFinish()

        // when
        vm.api.del('/users/1')

        // then
        await letNetworkRequestFinish()
        expect(axiosMock.history.delete.length).toEqual(1)
        expect(axiosMock.history.get.length).toEqual(2)
      })

      it('deletes an object from the store and reloads all entities referencing it', async () => {
        // given
        axiosMock.onGet('http://localhost/groups/99').replyOnce(200, multipleReferencesToUser)
        axiosMock.onGet('http://localhost/groups/99').reply(200, {
          id: 99,
          name: 'Pfadi Züri',
          _links: {
            self: {
              href: '/groups/99'
            }
          }
        })
        axiosMock.onGet('http://localhost/camps/123').reply(200, {
          id: 123,
          _links: {
            self: {
              href: '/camps/123'
            }
          }
        })
        axiosMock.onDelete('http://localhost/users/1').replyOnce(204)
        vm.api.get('/groups/99')
        await letNetworkRequestFinish()
        const user = vm.api.get('/users/1')

        // when
        vm.api.del(user)

        // then
        await letNetworkRequestFinish()
        expect(axiosMock.history.delete.length).toEqual(1)
        expect(axiosMock.history.get.length).toEqual(2)
      })

      it('breaks circular dependencies when deleting an entity in the reference circle', async () => {
        // given
        axiosMock.onDelete('http://localhost/periods/1').replyOnce(204)
        axiosMock.onGet('http://localhost/periods/1').replyOnce(200, circularReference.serverResponse)
        axiosMock.onGet('http://localhost/periods/1').networkError()
        axiosMock.onGet('http://localhost/days/2').reply(404)
        const load = vm.api.get('/periods/1')._meta.load
        await letNetworkRequestFinish()
        const period = await load
        expect(vm.$store.state.api).toMatchObject(circularReference.storeState)

        // when
        vm.api.del(period)

        // then
        await letNetworkRequestFinish()
        expect(axiosMock.history.get.length).toBe(2)
      })

      it('breaks circular dependencies when deleting an entity outside the reference circle', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/3').replyOnce(200, circularReference.campServerResponse)
        axiosMock.onGet('http://localhost/periods/1').replyOnce(200, circularReference.serverResponse)
        axiosMock.onDelete('http://localhost/camps/3').replyOnce(204)
        axiosMock.onGet('http://localhost/periods/1').replyOnce(200, circularReference.serverResponse)
        axiosMock.onGet('http://localhost/periods/1').networkError()
        axiosMock.onGet('http://localhost/days/2').reply(404)
        const load = vm.api.get('/camps/3')._meta.load
        const period = vm.api.get('/periods/1')._meta.load
        await letNetworkRequestFinish()
        const camp = await load
        expect(vm.$store.state.api).toMatchObject(circularReference.storeState)

        // when
        vm.api.del(camp)

        // then
        await letNetworkRequestFinish()
        expect(axiosMock.history.get.length).toBe(3)
        await period
      })

      it('transitively reloads cascade deleted entities', async () => {
        // given
        axiosMock.onGet('http://localhost/authors/99').replyOnce(200, {
          id: 99,
          _links: {
            self: {
              href: 'http://localhost/authors/99'
            }
          },
          _embedded: {
            latestBook: {
              id: 123,
              _links: {
                self: {
                  href: 'http://localhost/books/123'
                },
                author: {
                  href: 'http://localhost/authors/99'
                }
              },
              _embedded: {
                chapters: [{
                  id: 444,
                  _links: {
                    self: {
                      href: 'http://localhost/chapters/444'
                    },
                    book: {
                      href: 'http://localhost/books/123'
                    }
                  },
                  _embedded: {
                    teaserPage: {
                      id: 1234,
                      _links: {
                        self: {
                          href: 'http://localhost/pages/1234'
                        },
                        chapter: {
                          href: 'http://localhost/chapters/444'
                        }
                      }
                    }
                  }
                }]
              }
            }
          }
        })
        axiosMock.onDelete('http://localhost/authors/99').replyOnce(204)
        axiosMock.onGet('http://localhost/books/123').replyOnce(404)
        axiosMock.onGet('http://localhost/chapters/444').replyOnce(404)
        axiosMock.onGet('http://localhost/pages/1234').replyOnce(404)
        vm.api.get('/authors/99')
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).toHaveProperty('/authors/99')
        expect(vm.$store.state.api).toHaveProperty('/books/123')
        expect(vm.$store.state.api).toHaveProperty('/chapters/444')
        expect(vm.$store.state.api).toHaveProperty('/pages/1234')

        // when
        vm.api.del('/authors/99')

        // then
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).not.toHaveProperty('/authors/99')
        expect(vm.$store.state.api).not.toHaveProperty('/books/123')
        expect(vm.$store.state.api).not.toHaveProperty('/chapters/444')
        expect(vm.$store.state.api).not.toHaveProperty('/pages/1234')
      })

      it('automatically filters deleting items from standalone collection', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1/activities').reply(200, collectionFirstPage.serverResponse)
        axiosMock.onDelete('http://localhost/activities/2394').replyOnce(204)
        vm.api.get('/camps/1/activities')
        await letNetworkRequestFinish()
        const activity = vm.api.get('/activities/2394')

        // when
        vm.api.del(activity)

        // then
        expect(vm.api.get('/activities/2394')._meta.deleting).toBeTruthy()
        const standaloneCollection = vm.api.get('/camps/1/activities')
        expect(standaloneCollection.items.some(item => item._meta.deleting)).toBeFalsy()
        expect(standaloneCollection.items.length).toEqual(1)
        expect(standaloneCollection.allItems.some(item => item._meta.deleting)).toBeTruthy()
        expect(standaloneCollection.allItems.length).toEqual(2)
      })

      it('automatically filters deleting items from embedded collection', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, embeddedCollection.serverResponse)
        axiosMock.onDelete('http://localhost/periods/104').replyOnce(204)
        vm.api.get('/camps/1')
        await letNetworkRequestFinish()
        const period = vm.api.get('/periods/104')

        // when
        vm.api.del(period)

        // then
        expect(vm.api.get('/periods/104')._meta.deleting).toBeTruthy()
        const embCollection = vm.api.get('/camps/1').periods()
        expect(embCollection.items.some(item => item._meta.deleting)).toBeFalsy()
        expect(embCollection.items.length).toEqual(1)
        expect(embCollection.allItems.some(item => item._meta.deleting)).toBeTruthy()
        expect(embCollection.allItems.length).toEqual(2)
      })

      it('patches entity and stores the response into the store', async () => {
        // given
        const after = {
          _embedded: {
            campType: {
              id: 20,
              name: 'course',
              js: false,
              targetGroup: 'Kids',
              _links: {
                self: {
                  href: '/campTypes/20'
                }
              }
            }
          },
          id: 2,
          _links: {
            self: {
              href: '/camps/1'
            }
          }
        }
        axiosMock.onPatch('http://localhost/camps/1').reply(200, after)

        // when
        const load = vm.api.patch('/camps/1', { some: 'thing' })

        // then
        expect(vm.$store.state.api['/camps/1']._meta.loading).toBe(true)
        await letNetworkRequestFinish()
        expect(await load).toMatchObject({ id: 2, _meta: { self: 'http://localhost/camps/1' } })
        expect(vm.api.get('/camps/1')).toMatchObject({ id: 2, _meta: { self: 'http://localhost/camps/1' } })
        expect(vm.api.get('/campTypes/20')).toMatchObject({
          id: 20,
          name: 'course',
          js: false,
          targetGroup: 'Kids',
          _meta: { self: 'http://localhost/campTypes/20' }
        })
      })

      it('still returns old instance from store while patch is in progress', async () => {
        // given
        const before = {
          _embedded: {
            campType: {
              id: 20,
              name: 'camp',
              js: true,
              targetGroup: 'Kids',
              _links: {
                self: {
                  href: '/campTypes/20'
                }
              }
            }
          },
          id: 1,
          _links: {
            self: {
              href: '/camps/1'
            }
          }
        }
        const after = {
          _embedded: {
            campType: {
              id: 20,
              name: 'course',
              js: false,
              targetGroup: 'Kids',
              _links: {
                self: {
                  href: '/campTypes/20'
                }
              }
            }
          },
          id: 2,
          _links: {
            self: {
              href: '/camps/1'
            }
          }
        }
        axiosMock.onGet('http://localhost/camps/1').replyOnce(200, before)
        axiosMock.onGet('http://localhost/camps/1').reply(200, after)
        axiosMock.onPatch('http://localhost/camps/1').reply(200, after)
        vm.api.get('/camps/1')
        await letNetworkRequestFinish()

        // when
        const load = vm.api.patch('/camps/1', { some: 'thing' })

        // then
        expect(vm.$store.state.api['/camps/1']).toMatchObject({ id: 1, _meta: { self: '/camps/1' } })
        expect(vm.$store.state.api['/campTypes/20']).toMatchObject({
          id: 20,
          name: 'camp',
          js: true,
          targetGroup: 'Kids',
          _meta: { self: '/campTypes/20' }
        })
        await letNetworkRequestFinish()
        expect(await load).toMatchObject({ id: 2, _meta: { self: 'http://localhost/camps/1' } })
        expect(vm.api.get('/camps/1')).toMatchObject({ id: 2, _meta: { self: 'http://localhost/camps/1' } })
        expect(vm.api.get('/campTypes/20')).toMatchObject({
          id: 20,
          name: 'course',
          js: false,
          targetGroup: 'Kids',
          _meta: { self: 'http://localhost/campTypes/20' }
        })
      })

      it('posts entity and stores the response into the store', async () => {
        // given
        const axiosPostSpy = jest.fn(function (config) {
          return [
            200,
            embeddedSingleEntity.serverResponse
          ]
        })
        axiosMock.onPost('http://localhost/camps').reply(axiosPostSpy)

        // when
        const load = vm.api.post('/camps', { some: 'thing' })

        // then
        await letNetworkRequestFinish()
        expect(axiosPostSpy).toHaveBeenCalledWith(expect.objectContaining({ data: JSON.stringify({ some: 'thing' }) })) // verify correct data has been sent to axios
        expect(await load).toMatchObject({ id: 1, _meta: { self: 'http://localhost/camps/1' } })
        expect(vm.api.get('/camps/1')).toMatchObject({ id: 1, _meta: { self: 'http://localhost/camps/1' } })
        expect(vm.api.get('/campTypes/20')).toMatchObject({
          id: 20,
          name: 'camp',
          js: true,
          targetGroup: 'Kids',
          _meta: { self: 'http://localhost/campTypes/20' }
        })
      })

      it('gets the href of a linked entity without fetching the entity itself', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').replyOnce(200, linkedSingleEntity.serverResponse)
        axiosMock.onGet('http://localhost/users/83').networkError()

        // when
        const load = vm.api.href('/camps/1', 'main_leader')

        // then
        await letNetworkRequestFinish()
        expect(await load).toEqual('http://localhost/users/83')
      })

      it('gets the href of a templated linked entity without fetching the entity itself', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').replyOnce(200, templatedLink.linkingServerResponse)
        axiosMock.onGet('http://localhost/users/83').networkError()

        // when
        const load = vm.api.href('/camps/1', 'users', { id: 83 })

        // then
        await letNetworkRequestFinish()
        expect(await load).toEqual('http://localhost/camps/1/users/83')
        expect(vm.$store.state.api).toMatchObject(templatedLink.storeStateBeforeLinkedLoaded)
      })

      it('imports templated link to single entity when linking entity is still loading', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, templatedLink.linkingServerResponse)
        axiosMock.onGet('http://localhost/camps/1/users/83').reply(200, templatedLink.linkedServerResponse)
        const loadingCamp = vm.api.get('/camps/1')

        // when
        const load = loadingCamp.users({ id: 83 })._meta.load

        // then
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).toMatchObject(templatedLink.storeStateAfterLinkedLoaded)
        expect(await load).toMatchObject({
          id: 83,
          name: 'Pflock',
          _meta: { self: 'http://localhost/camps/1/users/83' }
        })
      })

      it('imports templated link to single entity when linking entity is already loaded', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, templatedLink.linkingServerResponse)
        axiosMock.onGet('http://localhost/camps/1/users/83').reply(200, templatedLink.linkedServerResponse)
        vm.api.get('/camps/1')
        await letNetworkRequestFinish()
        const camp = vm.api.get('/camps/1')

        // when
        const load = camp.users({ id: 83 })._meta.load

        // then
        expect(vm.$store.state.api).toMatchObject(templatedLink.storeStateBeforeLinkedLoaded)
        expect(vm.$store.state.api).not.toMatchObject(templatedLink.storeStateAfterLinkedLoaded)
        await letNetworkRequestFinish()
        expect(vm.$store.state.api).toMatchObject(templatedLink.storeStateAfterLinkedLoaded)
        expect(await load).toMatchObject({
          id: 83,
          name: 'Pflock',
          _meta: { self: 'http://localhost/camps/1/users/83' }
        })
      })

      it('sets property loading on LoadingStoreValue to true', () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, embeddedSingleEntity.serverResponse)
        const loadingStoreValue = vm.api.get('/camps/1')
        expect(loadingStoreValue._meta.loading).toBe(true)
      })

      it('returns error when `get` encounters network error', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').networkError()
        // when
        const load = vm.api.get('/camps/1')._meta.load
        // then
        await expect(load).rejects.toThrow('Error trying to fetch \"/camps/1\": Network Error')
      })

      it('returns error when `get` encounters network timeout', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').timeoutOnce()
        // when
        const load = vm.api.get('/camps/1')._meta.load
        // then
        await expect(load).rejects.toThrow('Error trying to fetch \"/camps/1\": timeout of 0ms exceeded')
      })

      it('returns error when `get` encounters 404 Not Found', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').replyOnce(404)

        // when
        const load = vm.api.get('/camps/1')._meta.load
        // then
        await expect(load).rejects.toThrow('Could not fetch \"/camps/1\" (status 404): Request failed with status code 404')
        expect(vm.$store.state.api['/camps/1']).toBeUndefined()
      })

      it('returns error when `get` encounters 403 Forbidden', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').replyOnce(403)
        // when
        const load = vm.api.get('/camps/1')._meta.load
        // then
        await expect(load).rejects.toThrow('No permission to fetch \"/camps/1\" (status 403): Request failed with status code 403')
      })

      it('returns error when `reload` encounters 404 Not Found', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').replyOnce(200, { id: 1, _links: { self: { href: '/camps/1' } } })
        axiosMock.onGet('http://localhost/camps/1').replyOnce(404)

        // when
        await vm.api.get('/camps/1')._meta.load
        // then
        expect(vm.$store.state.api['/camps/1']).toMatchObject({ id: 1, _meta: { self: '/camps/1' } })

        // when
        const load = vm.api.reload('/camps/1')
        // then
        await expect(load).rejects.toThrow('Could not reload \"/camps/1\" (status 404): Request failed with status code 404')
        expect(vm.$store.state.api['/camps/1']).toBeUndefined()
      })

      it('returns error when `patch` encounters network error', async () => {
        // given
        axiosMock.onPatch('http://localhost/camps/1').networkError()
        // when
        const load = vm.api.patch('/camps/1', {})
        // then
        await expect(load).rejects.toThrow('Error trying to patch \"/camps/1\": Network Error')
      })

      it('returns error when `patch` encounters network timeout', async () => {
        // given
        axiosMock.onPatch('http://localhost/camps/1').timeoutOnce()
        // when
        const load = vm.api.patch('/camps/1', {})
        // then
        await expect(load).rejects.toThrow('Error trying to patch \"/camps/1\": timeout of 0ms exceeded')
      })

      it('returns error when `patch` encounters 404 Not Found', async () => {
        // given
        axiosMock.onGet('http://localhost/camps/1').replyOnce(200, { id: 1, _links: { self: { href: '/camps/1' } } })
        axiosMock.onPatch('http://localhost/camps/1').replyOnce(404)

        // when
        await vm.api.get('/camps/1')._meta.load
        // then
        expect(vm.$store.state.api['/camps/1']).toMatchObject({ id: 1, _meta: { self: '/camps/1' } })

        // when
        const load = vm.api.patch('/camps/1', {})
        // then
        await expect(load).rejects.toThrow('Could not patch \"/camps/1\" (status 404): Request failed with status code 404')
        await expect(vm.$store.state.api['/camps/1']).toBeUndefined()
      })

      it('returns error when `patch` encounters 403 Forbidden', async () => {
        // given
        axiosMock.onPatch('http://localhost/camps/1').replyOnce(403)
        // when
        const load = vm.api.patch('/camps/1', {})
        // then
        await expect(load).rejects.toThrow('No permission to patch \"/camps/1\" (status 403): Request failed with status code 403')
      })

      it('returns error when `patch` encounters 422 Unprocessable Entity (Validation error)', async () => {
        // given
        axiosMock.onPatch('http://localhost/camps/1').replyOnce(422, {
          validation_messages: { title: { stringLengthTooShort: 'The input is less than 10 characters long' } },
          type: 'http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html',
          title: 'Unprocessable Entity',
          status: 422,
          detail: 'Failed Validation'
        }, {
          'content-type': 'application/problem+json'
        })

        // when
        const load = vm.api.patch('/camps/1', {})

        // then
        await expect(load).rejects.toThrow('Error trying to patch \"/camps/1\" (status 422): Request failed with status code 422')
      })

      it('can handle object property', async done => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, objectProperty.serverResponse)

        // when
        vm.api.get('/camps/1')
        await letNetworkRequestFinish()

        // then
        expect(vm.$store.state.api).toMatchObject(objectProperty.storeState)

        expect(vm.api.get('/camps/1').objectProperty).toBeInstanceOf(Object)
        expect(vm.api.get('/camps/1').objectProperty.a).toEqual(1)
        expect(vm.api.get('/camps/1').objectProperty.nested.b).toEqual(2)

        expect(vm.api.get('/camps/1').emptyObject).toBeInstanceOf(Object)
        expect(vm.api.get('/camps/1').emptyObject).toEqual({})
        done()
      })

      it('can handle array property', async done => {
        // given
        axiosMock.onGet('http://localhost/camps/1').reply(200, arrayProperty.serverResponse)

        // when
        vm.api.get('/camps/1')
        await letNetworkRequestFinish()

        // then
        expect(vm.$store.state.api).toMatchObject(arrayProperty.storeState)

        expect(vm.api.get('/camps/1').arrayProperty).toBeInstanceOf(Array)
        expect(vm.api.get('/camps/1').arrayProperty[0].a).toEqual(1)
        expect(vm.api.get('/camps/1').arrayProperty[0].nested[0].b).toEqual(2)

        expect(vm.api.get('/camps/1').emptyArray).toBeInstanceOf(Array)
        expect(vm.api.get('/camps/1').emptyArray).toEqual([])
        done()
      })

      it('throws error when accessing non-existing property like a relation', async done => {
        // given
        axiosMock.onGet('http://localhost/').reply(200, root.serverResponse)

        // when
        let loadingObject = null
        loadingObject = vm.api.get().nonexistingProperty()

        // then (loading)
        expect(loadingObject).toBeInstanceOf(LoadingStoreValue)
        expect(loadingObject.toJSON()).toEqual('{}')

        // then (loaded)
        await expect(loadingObject._meta.load).rejects.toThrow("Property 'nonexistingProperty' on resource http://localhost was used like a relation, but no relation with this name was returned by the API (actual return value: undefined)")

        done()
      })

      it('throws error when accessing primitive property like a relation', async done => {
        // given
        axiosMock.onGet('http://localhost/').reply(200, root.serverResponse)

        // when
        let loadingObject = null
        loadingObject = vm.api.get().the()

        // then (loading)
        expect(loadingObject).toBeInstanceOf(LoadingStoreValue)
        expect(loadingObject.toJSON()).toEqual('{}')

        // then (loaded)
        await expect(loadingObject._meta.load).rejects.toThrow("Property 'the' on resource http://localhost was used like a relation, but no relation with this name was returned by the API (actual return value: \"root\")")

        done()
      })
    })
  })
})
