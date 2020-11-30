import normalize from 'hal-json-normalizer'
import urltemplate from 'url-template'
import { normalizeEntityUri } from './normalizeUri'
import StoreValueCreator from './StoreValueCreator'
import StoreValue from './StoreValue'
import LoadingStoreValue from './LoadingStoreValue'
import storeModule from './storeModule'
import QueryablePromise from './QueryablePromise'

/**
 * Error class for returning server exceptions (attaches response object to error)
 * @param response        Axios response object
 * @param ...params       Any other parameters from default Error constructor (message, etc.)
 */
export class ServerException extends Error {
  constructor (response, ...params) {
    super(...params)

    if (!this.message) {
      this.message = 'Server error ' + response.status + ' (' + response.statusText + ')'
    }
    this.name = 'ServerException'
    this.response = response
  }
}

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
function HalJsonVuex (store, axios, options) {
  const defaultOptions = {
    apiName: 'api',
    avoidNPlusOneRequests: true,
    forceRequestedSelfLink: false,
    nuxtInject: null
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
  function post (uriOrCollection, data) {
    const uri = normalizeEntityUri(uriOrCollection, axios.defaults.baseURL)
    if (uri === null) {
      return Promise.reject(new Error(`Could not perform POST, "${uriOrCollection}" is not an entity or URI`))
    }
    return new QueryablePromise(axios.post(axios.defaults.baseURL + uri, preparePostData(data)).then(({ data }) => {
      storeHalJsonData(data)
      return get(data._links.self.href)
    }, (error) => {
      throw handleAxiosError(uri, error)
    }))
  }

  /**
   * Reloads an entity from the API.
   *
   * @param uriOrEntity URI (or instance) of an entity to reload from the API
   * @returns Promise   Resolves when the GET request has completed and the updated entity is available
   *                    in the Vuex store.
   */
  function reload (uriOrEntity) {
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
   * @param uriOrEntity URI (or instance) of an entity to load from the store or API
   * @param forceReload If true, the entity will be fetched from the API even if it is already in the Vuex store.
   *                    Note that the function will still return the old value in this case, but you can
   *                    wait for the new value using the ._meta.load promise.
   * @returns entity    Entity from the store. Note that when fetching an object for the first time, a reactive
   *                    dummy is returned, which will be replaced with the true data through Vue's reactivity
   *                    system as soon as the API request finishes.
   */
  function get (uriOrEntity, forceReload = false) {
    const forceReloadingEmbeddedCollection = forceReload && uriOrEntity._meta && uriOrEntity._meta.reload && uriOrEntity._meta.reload.uri
    const uri = forceReloadingEmbeddedCollection
      ? normalizeEntityUri(uriOrEntity._meta.reload.uri, axios.defaults.baseURL)
      : normalizeEntityUri(uriOrEntity, axios.defaults.baseURL)
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
      ? storeValueCreator.wrap(storeData)[uriOrEntity._meta.reload.property]()
      : storeValueCreator.wrap(storeData)
  }

  function isUnknown (uri) {
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
  function load (uri, forceReload) {
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

    let dataFinishedLoading = Promise.resolve(store.state[opts.apiName][uri])
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
  function loadFromApi (uri) {
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
  async function href (uriOrEntity, relation, templateParams = {}) {
    const self = normalizeEntityUri(await get(uriOrEntity)._meta.load, axios.defaults.baseURL)
    const rel = store.state[opts.apiName][self][relation]
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
  function patch (uriOrEntity, data) {
    const uri = normalizeEntityUri(uriOrEntity, axios.defaults.baseURL)
    if (uri === null) {
      return Promise.reject(new Error(`Could not perform PATCH, "${uriOrEntity}" is not an entity or URI`))
    }
    const existsInStore = !isUnknown(uri)

    if (!existsInStore) {
      store.commit('addEmpty', uri)
    }

    store.state[opts.apiName][uri]._meta.load = new QueryablePromise(axios.patch(axios.defaults.baseURL + uri, data).then(({ data }) => {
      if (opts.forceRequestedSelfLink) {
        data._links.self.href = uri
      }
      storeHalJsonData(data)
      return get(uri)
    }, (error) => {
      throw handleAxiosError(uri, error)
    }))

    return store.state[opts.apiName][uri]._meta.load
  }

  /**
   * Removes a single entity from the Vuex store (but does not delete it using the API). Note that if the
   * entity is currently referenced and displayed through any other entity, the reactivity system will
   * immediately re-fetch the purged entity from the API in order to re-display it.
   * @param uriOrEntity URI (or instance) of an entity which should be removed from the Vuex store
   */
  function purge (uriOrEntity) {
    const uri = normalizeEntityUri(uriOrEntity, axios.defaults.baseURL)
    if (uri === null) {
      // Can't purge an unknown URI, do nothing
      return
    }
    store.commit('purge', uri)
    return uri
  }

  /**
   * Removes all stored entities from the Vuex store (but does not delete them using the API).
   */
  function purgeAll () {
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
  function del (uriOrEntity) {
    const uri = normalizeEntityUri(uriOrEntity, axios.defaults.baseURL)
    if (uri === null) {
      // Can't delete an unknown URI, do nothing
      return Promise.reject(new Error(`Could not perform DELETE, "${uriOrEntity}" is not an entity or URI`))
    }
    store.commit('deleting', uri)
    return new QueryablePromise(axios.delete(axios.defaults.baseURL + uri).then(
      () => deleted(uri),
      (error) => {
        store.commit('deletingFailed', uri)
        throw handleAxiosError(uri, error)
      }
    ))
  }

  function valueIsArrayWithReferenceTo (value, uri) {
    return Array.isArray(value) && value.some(entry => valueIsReferenceTo(entry, uri))
  }

  function valueIsReferenceTo (value, uri) {
    if (value === null) return false

    const objectKeys = Object.keys(value)
    return objectKeys.length === 1 && objectKeys[0] === 'href' && value.href === uri
  }

  function findEntitiesReferencing (uri) {
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
  function deleted (uri) {
    return Promise.all(findEntitiesReferencing(uri)
      // don't reload entities that are already being deleted, to break circular dependencies
      .filter(outdatedEntity => !outdatedEntity._meta.deleting)

      // reload entities but ignore any errors (such as 404 errors during reloading)
      .map(outdatedEntity => reload(outdatedEntity).catch(() => {}))
    ).then(() => purge(uri))
  }

  /**
   * Normalizes raw data from the backend and stores it into the Vuex store.
   * @param data HAL JSON data received from the backend
   */
  function storeHalJsonData (data) {
    const normalizedData = normalize(data, {
      camelizeKeys: false,
      metaKey: '_meta',
      normalizeUri: (uri) => normalizeEntityUri(uri, axios.defaults.baseURL),
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
   * @param promise
   */
  function setLoadPromiseOnStore (uri, promise = null) {
    store.state[opts.apiName][uri]._meta.load = promise ? new QueryablePromise(promise) : QueryablePromise.resolve(store.state[opts.apiName][uri])
  }

  /**
   * Replace store items with {itemnameId: id}
   * @param data to be processed
   * @param name is the name of the entities
   * @returns cleaned data
   */
  function preparePostData (data, name = null) {
    return Array.isArray(data)
      ? data.map(value => {
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
      : Object.fromEntries(Object.entries(data).map(([prop, value]) => {
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

  /**
   * Processes error object received from Axios for further usage. Triggers delete chain as side effect.
   * @param uri             Requested URI that triggered the error
   * @param error           Raw error object received from Axios
   * @returns Error         Return new error object with human understandable error message
   */
  function handleAxiosError (uri, error) {
    // Server Error (response received but with error code)
    if (error.response) {
      const response = error.response

      if (response.status === 404) {
        // 404 Entity not found error
        store.commit('deleting', uri)
        deleted(uri).then(() => {}) // no need to wait for delete operation to finish
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

  const halJsonVuex = { post, get, reload, del, patch, purge, purgeAll, href, isUnknown, StoreValue, LoadingStoreValue }

  function install (Vue) {
    if (this.installed) return

    if (opts.nuxtInject === null) {
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
