import normalize from 'hal-json-normalizer'
import urltemplate from 'url-template'
import normalizeEntityUri from './normalizeEntityUri'
import StoreValueCreator from './StoreValueCreator'
import StoreValue from './StoreValue'
import LoadingStoreValue from './LoadingStoreValue'
import storeModule, { State } from './storeModule'
import ServerException from './ServerException'
import { createResolvedPromise, wrapPromise } from './QueryablePromise'
import { ExternalConfig } from './interfaces/Config'
import { Store } from 'vuex/types'
import { AxiosInstance, AxiosError } from 'axios'
import Resource, { EmbeddedCollectionType } from './interfaces/Resource'
import StoreData from './interfaces/StoreData'
import ApiActions from './interfaces/ApiActions'
import EmbeddedCollection from './EmbeddedCollection'

/**
 * Defines the API store methods available in all Vue components. The methods can be called as follows:
 *
 * // In a computed or method or lifecycle hook
 * let someEntity = this.api.get('/some/endpoint')
 * this.api.reload(someEntity)
 *
 * // In the <template> part of a Vue component
 * <li v-for="book in api.get('/all/my/books').items" :key="book._meta.self">...</li>
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HalJsonVuex (store: Store<Record<string, State>>, axios: AxiosInstance, options: ExternalConfig): any {
  const defaultOptions = {
    apiName: 'api',
    avoidNPlusOneRequests: true,
    forceRequestedSelfLink: false,
    nuxtInject: undefined
  }
  const opts = { ...defaultOptions, ...options, apiRoot: axios.defaults.baseURL }

  store.registerModule(opts.apiName, { state: {}, ...storeModule })

  const storeValueCreator = new StoreValueCreator({ get, reload, post, patch, del, isUnknown }, opts)

  if (opts.nuxtInject !== null) axios = adaptNuxtAxios(axios)

  /**
   * Since Nuxt.js uses $get, $post etc., we need to use an adapter in the case of a Nuxt.js app...
   * @param $axios
   */
  function adaptNuxtAxios ($axios) {
    return {
      get: $axios.$get,
      patch: $axios.$patch,
      post: $axios.$post,
      delete: $axios.$delete,
      ...$axios
    }
  }

  /**
   * Sends a POST request to the backend, in order to create a new entity. Note that this does not
   * reload any collections that this new entity might be in, the caller has to do that on its own.
   * @param uriOrCollection URI (or instance) of a collection in which the entity should be created
   * @param data            Payload to be sent in the POST request
   * @returns Promise       resolves when the POST request has completed and the entity is available
   *                        in the Vuex store.
   */
  function post (uriOrCollection: string | Resource, data: unknown): Promise<Resource> {
    const uri = normalizeEntityUri(uriOrCollection, axios.defaults.baseURL)
    if (uri === null) {
      return Promise.reject(new Error(`Could not perform POST, "${uriOrCollection}" is not an entity or URI`))
    }

    return axios.post(axios.defaults.baseURL + uri, preparePostData(data)).then(({ data }) => {
      storeHalJsonData(data)
      return get(data._links.self.href)
    }, (error) => {
      throw handleAxiosError(uri, error)
    })
  }

  /**
   * Reloads an entity from the API.
   *
   * @param uriOrEntity URI (or instance) of an entity to reload from the API
   * @returns Promise   Resolves when the GET request has completed and the updated entity is available
   *                    in the Vuex store.
   */
  async function reload (uriOrEntity: string | Resource | EmbeddedCollectionType | StoreData): Promise<Resource> {
    return get(uriOrEntity, true)._meta.load
  }

  /**
   * Retrieves an entity from the Vuex store, or from the API in case it is not already fetched or a reload
   * is forced.
   * This function attempts to hide all backend implementation details such as pagination, linked vs.
   * embedded relations and loading state and instead provide an easy-to-use and consistent interface for
   * developing frontend components.
   *
   * Basic usage in a Vue component:
   * computed: {
   *   allCamps () { return this.api.get('/camp').items }
   *   oneSpecificCamp () { return this.api.get(`/camp/${this.campId}`) }
   *   campUri () { return this.oneSpecificCamp._meta.self }
   *   activityTypes () { return this.oneSpecificCamp.activityTypes() }
   *   user () { return this.api.get().profile() } // Root endpoint ('/') and navigate through self-discovery API
   * },
   * created () {
   *   this.oneSpecificCamp._meta.load.then(() => {
   *     // do something now that the camp is loaded from the API
   *   })
   * }
   *
   * @param uriOrEntity URI (or instance) of an entity to load from the store or API. If omitted, the root resource of the API is returned.
   * @param forceReload If true, the entity will be fetched from the API even if it is already in the Vuex store.
   *                    Note that the function will still return the old value in this case, but you can
   *                    wait for the new value using the ._meta.load promise.
   * @returns entity    Entity from the store. Note that when fetching an object for the first time, a reactive
   *                    dummy is returned, which will be replaced with the true data through Vue's reactivity
   *                    system as soon as the API request finishes.
   */
  function get (uriOrEntity: string | Resource | EmbeddedCollectionType | StoreData = '', forceReload = false): Resource {
    let forceReloadingEmbeddedCollection = false
    let uri: string | null = null

    if (isEmbeddedCollectionType(uriOrEntity)) { // = type guard for Embedded Collection
      if (forceReload && uriOrEntity._meta.reload.uri) {
        forceReloadingEmbeddedCollection = true
        uri = normalizeEntityUri(uriOrEntity._meta.reload.uri, axios.defaults.baseURL)
      } else {
        // TODO: What should happen in this path? get() on embeddedCollection but no forceReload. Can this even happen?
        throw new Error(`Cannot GET on an embedded collection "${uriOrEntity}" without forceReload=true`)
      }
    } else {
      uri = normalizeEntityUri(uriOrEntity, axios.defaults.baseURL)
    }

    if (uri === null) {
      if (uriOrEntity instanceof LoadingStoreValue) {
        // A LoadingStoreValue is safe to return without breaking the UI.
        return uriOrEntity
      }
      // We don't know anything about the requested object, something is wrong.
      throw new Error(`Could not perform GET, "${uriOrEntity}" is not an entity or URI`)
    }

    const storeData = load(uri, forceReload)

    return forceReloadingEmbeddedCollection
      ? storeValueCreator.wrap(storeData)[(uriOrEntity as EmbeddedCollection)._meta.reload.property]()
      : storeValueCreator.wrap(storeData)
  }

  /**
   * Type guard for EmbeddedCollectionType
   * @param uriOrEntity
   */
  function isEmbeddedCollectionType (uriOrEntity: string | Resource | EmbeddedCollectionType | StoreData | null): uriOrEntity is EmbeddedCollectionType {
    if (uriOrEntity === null) return false

    if (typeof uriOrEntity === 'string') return false

    // found an actual EmbeddedCollection instance
    if (uriOrEntity instanceof EmbeddedCollection) return true

    // found an object that looks like an EmbeddedCollectionType
    return 'reload' in uriOrEntity._meta
  }

  /**
   * Returns true if uri doesn't exist in store (never loaded before)
   * @param uri
   */
  function isUnknown (uri: string): boolean {
    return !(uri in store.state[opts.apiName])
  }

  /**
   * Loads the entity specified by the URI from the Vuex store, or from the API if necessary. If applicable,
   * sets the load promise on the entity in the Vuex store.
   * @param uri         URI of the entity to load
   * @param forceReload If true, the entity will be fetched from the API even if it is already in the Vuex store.
   * @returns entity    the current entity data from the Vuex store. Note: This may be a reactive dummy if the
   *                    backend request is still ongoing.
   */
  function load (uri: string, forceReload: boolean): StoreData {
    const existsInStore = !isUnknown(uri)

    const isAlreadyLoading = existsInStore && (store.state[opts.apiName][uri]._meta || {}).loading
    const isAlreadyReloading = existsInStore && (store.state[opts.apiName][uri]._meta || {}).reloading
    if (isAlreadyLoading || (forceReload && isAlreadyReloading)) {
      // Reuse the loading entity and load promise that is already waiting for a pending API request
      return store.state[opts.apiName][uri]
    }

    if (!existsInStore) {
      store.commit('addEmpty', uri)
    } else if (forceReload) {
      store.commit('reloading', uri)
    }

    let dataFinishedLoading: Promise<StoreData> = Promise.resolve(store.state[opts.apiName][uri])
    if (!existsInStore) {
      dataFinishedLoading = loadFromApi(uri)
    } else if (forceReload) {
      dataFinishedLoading = loadFromApi(uri).catch(error => {
        store.commit('reloadingFailed', uri)
        throw error
      })
    } else if (store.state[opts.apiName][uri]._meta.load) {
      // reuse the existing promise from the store if possible
      dataFinishedLoading = store.state[opts.apiName][uri]._meta.load
    }

    setLoadPromiseOnStore(uri, dataFinishedLoading)

    return store.state[opts.apiName][uri]
  }

  /**
   * Loads the entity specified by the URI from the API and stores it into the Vuex store. Returns a promise
   * that resolves to the raw data stored in the Vuex store (needs to be storeValueCreator.wrapped into a StoreValue before
   * being usable in Vue components).
   * @param uri       URI of the entity to load from the API
   * @returns Promise resolves to the raw data stored in the Vuex store after the API request completes, or
   *                  rejects when the API request fails
   */
  function loadFromApi (uri: string): Promise<StoreData> {
    return new Promise((resolve, reject) => {
      axios.get(axios.defaults.baseURL + uri).then(
        ({ data }) => {
          if (opts.forceRequestedSelfLink) {
            data._links.self.href = uri
          }
          storeHalJsonData(data)
          resolve(store.state[opts.apiName][uri])
        },
        (error) => {
          reject(handleAxiosError(uri, error))
        }
      )
    })
  }

  /**
   * Loads the URI of a related entity from the store, or the API in case it is not already fetched.
   *
   * @param uriOrEntity    URI (or instance) of an entity from the API
   * @param relation       the name of the relation for which the URI should be retrieved
   * @param templateParams in case the relation is a templated link, the template parameters that should be filled in
   * @returns Promise      resolves to the URI of the related entity.
   */
  async function href (uriOrEntity: string | Resource, relation: string, templateParams = {}): Promise<string | undefined> {
    const self = normalizeEntityUri(await get(uriOrEntity)._meta.load, axios.defaults.baseURL)
    const rel = self ? store.state[opts.apiName][self][relation] : null
    if (!rel || !rel.href) return undefined
    if (rel.templated) {
      return urltemplate.parse(rel.href).expand(templateParams)
    }
    return axios.defaults.baseURL + rel.href
  }

  /**
   * Sends a PATCH request to the backend, in order to update some fields in an existing entity.
   * @param uriOrEntity URI (or instance) of an entity which should be updated
   * @param data        Payload (fields to be updated) to be sent in the PATCH request
   * @returns Promise   resolves when the PATCH request has completed and the updated entity is available
   *                    in the Vuex store.
   */
  function patch (uriOrEntity: string | Resource, data: unknown) : Promise<Resource> {
    const uri = normalizeEntityUri(uriOrEntity, axios.defaults.baseURL)
    if (uri === null) {
      return Promise.reject(new Error(`Could not perform PATCH, "${uriOrEntity}" is not an entity or URI`))
    }
    const existsInStore = !isUnknown(uri)

    if (!existsInStore) {
      store.commit('addEmpty', uri)
    }

    const returnedResource = axios.patch(axios.defaults.baseURL + uri, data).then(({ data }) => {
      if (opts.forceRequestedSelfLink) {
        data._links.self.href = uri
      }
      storeHalJsonData(data)
      return get(uri)
    }, (error) => {
      throw handleAxiosError(uri, error)
    })

    // TODO: cannot put the promise back to store, because store assumes 'load' to be a promise that resolves to StoreData, but returnedResource resolves to Resource
    // is it really needed?
    //
    // store.state[opts.apiName][uri]._meta.load = returnedResource

    return returnedResource
  }

  /**
   * Removes a single entity from the Vuex store (but does not delete it using the API). Note that if the
   * entity is currently referenced and displayed through any other entity, the reactivity system will
   * immediately re-fetch the purged entity from the API in order to re-display it.
   * @param uriOrEntity URI (or instance) of an entity which should be removed from the Vuex store
   */
  function purge (uriOrEntity: string | Resource): string | void {
    const uri = normalizeEntityUri(uriOrEntity, axios.defaults.baseURL)
    if (uri === null) {
      // Can't purge an unknown URI, do nothing
      return
    }
    store.commit('purge', uri)
    return uri // TODO: or return nothing? what should be the return value of purge, deleted & del?
  }

  /**
   * Removes all stored entities from the Vuex store (but does not delete them using the API).
   */
  function purgeAll (): void {
    store.commit('purgeAll')
  }

  /**
   * Attempts to permanently delete a single entity using a DELETE request to the API.
   * This function performs the following operations when given the URI of an entity E:
   * 1. Marks E in the Vuex store with the ._meta.deleting flag
   * 2. Sends a DELETE request to the API in order to delete E from the backend (in case of failure, the
   *    deleted flag is reset and the operation is aborted)
   * 3. Finds all entities [...R] in the store that reference E (e.g. find the corresponding camp when
   *    deleting an activity) and reloads them from the API
   * 4. Purges E from the Vuex store
   * @param uriOrEntity URI (or instance) of an entity which should be deleted
   * @returns Promise   resolves when the DELETE request has completed and either all related entites have
   *                    been reloaded from the API, or the failed deletion has been cleaned up.
   */
  function del (uriOrEntity: string | Resource): Promise<string | void> {
    const uri = normalizeEntityUri(uriOrEntity, axios.defaults.baseURL)
    if (uri === null) {
      // Can't delete an unknown URI, do nothing
      return Promise.reject(new Error(`Could not perform DELETE, "${uriOrEntity}" is not an entity or URI`))
    }
    store.commit('deleting', uri)
    return axios.delete(axios.defaults.baseURL + uri).then(
      () => deleted(uri),
      (error) => {
        store.commit('deletingFailed', uri)
        throw handleAxiosError(uri, error)
      }
    )
  }

  function valueIsArrayWithReferenceTo (value: unknown, uri: string) {
    return Array.isArray(value) && value.some(entry => valueIsReferenceTo(entry, uri))
  }

  function valueIsReferenceTo (value: Record<string, unknown>, uri: string): boolean {
    if (value === null) return false

    const objectKeys = Object.keys(value)
    return objectKeys.length === 1 && objectKeys[0] === 'href' && value.href === uri
  }

  function findEntitiesReferencing (uri: string) : Array<StoreData> {
    return Object.values(store.state[opts.apiName])
      .filter((entity) => {
        return Object.values(entity).some(propertyValue =>
          valueIsReferenceTo(propertyValue, uri) || valueIsArrayWithReferenceTo(propertyValue, uri)
        )
      })
  }

  /**
   * Cleans up the Vuex store after an entity is found to be deleted (HTTP status 204 or 404) from the backend.
   * @param uri       URI of an entity which is not available (anymore) in the backend
   * @returns Promise resolves when the cleanup has completed and the Vuex store is up to date again
   */
  function deleted (uri: string): Promise<string | void> {
    return Promise.all(findEntitiesReferencing(uri)
      // don't reload entities that are already being deleted, to break circular dependencies
      .filter(outdatedEntity => !outdatedEntity._meta.deleting)

      // reload outdated entities...
      .map(outdatedEntity => reload(outdatedEntity).catch(() => {
        // ...but ignore any errors (such as 404 errors during reloading)
      }))
    ).then(() => purge(uri))
  }

  /**
   * Normalizes raw data from the backend and stores it into the Vuex store.
   * @param data HAL JSON data received from the backend
   */
  function storeHalJsonData (data: Record<string, unknown>): void {
    const normalizedData = normalize(data, {
      camelizeKeys: false,
      metaKey: '_meta',
      normalizeUri: (uri: string) => normalizeEntityUri(uri, axios.defaults.baseURL),
      filterReferences: true,
      embeddedStandaloneCollectionKey: 'items'
    })
    store.commit('add', normalizedData)

    Object.keys(normalizedData).forEach(uri => {
      setLoadPromiseOnStore(uri)
    })
  }

  /**
   * Mutate the store state without telling Vuex about it, so it won't complain and won't make the load promise
   * reactive.
   * The promise is needed in the store for some special cases when a loading entity is requested a second time with
   * this.api.get(...) or this.api.reload(...), or when an embedded collection is reloaded.
   * @param uri
   * @param loadStoreData
   */
  function setLoadPromiseOnStore (uri: string, loadStoreData: Promise<StoreData> | null = null) {
    store.state[opts.apiName][uri]._meta.load = loadStoreData ? wrapPromise(loadStoreData) : createResolvedPromise(store.state[opts.apiName][uri])
  }

  /**
   * Replace store items with {itemnameId: id}
   * @param data to be processed
   * @param name is the name of the entities
   * @returns cleaned data
   */
  function preparePostData (data: unknown, name: string|null = null) {
    if (data === null) { return null }

    if (Array.isArray(data)) {
      return data.map(value => {
        if (value !== null && typeof value === 'object') {
          if (value._meta && value._meta.self) {
            return name ? { [name.replace(/ies/, 'y') + 'Id']: value.id } : { id: value.id }
          } else {
            return preparePostData(value, name)
          }
        } else {
          return value
        }
      })
    }

    if (typeof data === 'object' && data !== null) {
      return Object.fromEntries(Object.entries(data).map(([prop, value]) => {
        const type = Object.prototype.toString.call(value)
        if (type.includes('Function')) {
          value = value()
        }
        if (value !== null && typeof value === 'object') {
          if (value._meta && value._meta.self) {
            return [prop + 'Id', value.id]
          } else {
            return [prop, preparePostData(value, prop)]
          }
        } else {
          return [prop, value]
        }
      }))
    }
  }

  /**
   * Processes error object received from Axios for further usage. Triggers delete chain as side effect.
   * @param uri             Requested URI that triggered the error
   * @param error           Raw error object received from Axios
   * @returns Error         Return new error object with human understandable error message
   */
  function handleAxiosError (uri: string, error: AxiosError): Error {
    // Server Error (response received but with error code)
    if (error.response) {
      const response = error.response

      if (response.status === 404) {
        // 404 Entity not found error
        store.commit('deleting', uri)
        deleted(uri) // no need to wait for delete operation to finish
        return new ServerException(response, `Could not perform operation, "${uri}" has been deleted`)
      } else if (response.status === 403) {
        // 403 Permission error
        return new ServerException(response, 'No permission to perform operation')
      } else if (response.headers['content-type'] === 'application/problem+json') {
        // API Problem
        return new ServerException(response, 'Server-Error ' + response.status + ' (' + response.data.detail + ')')
      } else {
        // other unknown server error (not of type application/problem+json)
        return new ServerException(response)
      }
    } else {
      // another error (most probably connection timeout; no response received)
      return new Error('Could not connect to server. Check your internet connection and try again.')
    }
  }

  const apiActions: ApiActions = { post, get, reload, del, patch, isUnknown }
  const halJsonVuex = { ...apiActions, purge, purgeAll, href, StoreValue, LoadingStoreValue }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function install (this: any, Vue: any) {
    if (this.installed) return // TODO: installed was never defined. Where's this coming from?

    if (!opts.nuxtInject) {
      // Normal installation in a Vue app
      Object.defineProperties(Vue.prototype, {
        [opts.apiName]: {
          get () {
            return halJsonVuex
          }
        }
      })
    } else {
      // Support for Nuxt-style inject installation
      opts.nuxtInject(opts.apiName, halJsonVuex)
    }
  }

  return { ...halJsonVuex, install }
}

export default HalJsonVuex
