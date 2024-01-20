import normalize from 'hal-json-normalizer'
import urltemplate from 'url-template'
import normalizeEntityUri from './normalizeEntityUri'
import ResourceCreator from './ResourceCreator'
import Resource from './Resource'
import LoadingResource from './LoadingResource'
import storeModule, { State } from './storeModule'
import ServerException from './ServerException'
import { ExternalConfig } from './interfaces/Config'
import { Store } from 'vuex/types'
import { AxiosInstance, AxiosError } from 'axios'
import ResourceInterface from './interfaces/ResourceInterface'
import StoreData, { Link, SerializablePromise } from './interfaces/StoreData'
import ApiActions from './interfaces/ApiActions'
import { isVirtualResource } from './halHelpers'

/**
 * Defines the API store methods available in all Vue components. The methods can be called as follows:
 *
 * // In a computed or method or lifecycle hook
 * let book = this.api.get('/books/1')
 * this.api.reload(book)
 *
 * // In the <template> part of a Vue component
 * <li v-for="book in api.get('/books').items" :key="book._meta.self">...</li>
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HalJsonVuex (store: Store<Record<string, State>>, axios: AxiosInstance, options: ExternalConfig): any {
  const defaultOptions = {
    apiName: 'api',
    avoidNPlusOneRequests: true,
    forceRequestedSelfLink: false
  }
  const opts = { ...defaultOptions, ...options, apiRoot: axios.defaults.baseURL }

  store.registerModule(opts.apiName, { state: {}, ...storeModule })

  const resourceCreator = new ResourceCreator({ get, reload, post, patch, del, href, isUnknown }, opts)

  /**
   * Sends a POST request to the API, in order to create a new entity. Note that this does not
   * reload any collections that this new entity might be in, the caller has to do that on their own.
   * @param uriOrCollection URI (or instance) of a collection in which the entity should be created
   * @param data            Payload to be sent in the POST request
   * @returns Promise       resolves when the POST request has completed and the entity is available
   *                        in the Vuex store.
   */
  function post (uriOrCollection: string | ResourceInterface, data: unknown): Promise<ResourceInterface | null> {
    const uri = normalizeEntityUri(uriOrCollection, axios.defaults.baseURL)
    if (uri === null) {
      return Promise.reject(new Error(`Could not perform POST, "${uriOrCollection}" is not an entity or URI`))
    }

    if (!isUnknown(uri)) {
      const entity = get(uri)
      if (isVirtualResource(entity)) {
        return Promise.reject(new Error('post is not implemented for virtual resources'))
      }
    }

    return axios.post(uri || '/', data).then(({ data, status }) => {
      if (status === 204) {
        return null
      }
      storeHalJsonData(data)
      return get(data._links.self.href)
    }, (error) => {
      throw handleAxiosError('post to', uri, error)
    })
  }

  /**
   * Retrieves an entity from the Vuex store, or from the API in case it is not already fetched or a reload
   * is forced.
   * This function attempts to hide all API implementation details such as pagination, linked vs.
   * embedded relations and loading state and instead provide an easy-to-use and consistent interface for
   * developing frontend components.
   *
   * Basic usage in a Vue component:
   * computed: {
   *   allBooks () { return this.api.get('/books').items }
   *   oneSpecificBook () { return this.api.get(`/books/${this.bookId}`) }
   *   bookUri () { return this.oneSpecificBook._meta.self }
   *   chapters () { return this.oneSpecificBook.chapters() }
   *   user () { return this.api.get().profile() } // Root endpoint ('/') and navigate through self-discovery API
   * },
   * created () {
   *   this.oneSpecificBook._meta.load.then(() => {
   *     // do something now that the book is loaded from the API
   *   })
   * }
   *
   * @param uriOrEntity URI (or instance) of an entity to load from the store or API. If omitted, the root resource of the API is returned.
   * @returns entity    Entity from the store. Note that when fetching an object for the first time, a reactive
   *                    dummy is returned, which will be replaced with the true data through Vue's reactivity
   *                    system as soon as the API request finishes.
   */
  function get (uriOrEntity: string | ResourceInterface = ''): ResourceInterface {
    const uri = normalizeEntityUri(uriOrEntity, axios.defaults.baseURL)

    if (uri === null) {
      if (uriOrEntity instanceof LoadingResource) {
        // A LoadingResource is safe to return without breaking the UI.
        return uriOrEntity
      }
      // We don't know anything about the requested object, something is wrong.
      throw new Error(`Could not perform GET, "${uriOrEntity}" is not an entity or URI`)
    }

    setLoadPromiseOnStore(uri, load(uri, false))
    return resourceCreator.wrap(store.state[opts.apiName][uri])
  }

  /**
   * Reloads an entity from the API and returns a Promise that resolves when the reload has finished.
   * This function contains protection against duplicate network requests, so while a reload is running,
   * no second reload for the same URI will be triggered.
   * Reloading does not set the ._meta.loading boolean flag.
   *
   * @param uriOrEntity URI (or instance) of an entity to reload from the API
   * @returns Promise   Resolves when the GET request has completed and the updated entity is available
   *                    in the Vuex store.
   */
  async function reload (uriOrEntity: string | ResourceInterface): Promise<ResourceInterface> {
    let resource: ResourceInterface

    if (typeof uriOrEntity === 'string') {
      resource = get(uriOrEntity)
    } else {
      resource = uriOrEntity
    }

    if (isVirtualResource(resource)) {
      // For embedded collections which had to reload the parent entity, unwrap the embedded collection after loading has finished
      const { owningResource, owningRelation } = resource._storeData._meta
      return reload(owningResource).then(owner => owner[owningRelation]())
    }

    const uri = normalizeEntityUri(resource, axios.defaults.baseURL)

    if (uri === null) {
      // We don't know anything about the requested object, something is wrong.
      throw new Error(`Could not perform reload, "${uriOrEntity}" is not an entity or URI`)
    }

    const loadPromise = load(uri, true)
    // Catch all errors for the Promise that is saved to the store, to avoid unhandled promise rejections.
    // The errors are still available to catch on the promise returned by reload.
    setLoadPromiseOnStore(uri, loadPromise.catch(() => {
      return store.state[opts.apiName][uri]
    }))

    return loadPromise.then(storeData => resourceCreator.wrap(storeData))
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
   *                    API request is still ongoing.
   */
  function load (uri: string, forceReload: boolean): Promise<StoreData> {
    const existsInStore = !isUnknown(uri)

    const isAlreadyLoading = existsInStore && (store.state[opts.apiName][uri]._meta || {}).loading
    const isAlreadyReloading = existsInStore && (store.state[opts.apiName][uri]._meta || {}).reloading
    if (isAlreadyLoading || (forceReload && isAlreadyReloading)) {
      // Reuse the loading entity and load promise that is already waiting for a pending API request
      return store.state[opts.apiName][uri]._meta.load
    }

    if (!existsInStore) {
      store.commit('addEmpty', uri)
    } else if (forceReload) {
      store.commit('reloading', uri)
    }

    if (!existsInStore) {
      return loadFromApi(uri, 'fetch')
    } else if (forceReload) {
      return loadFromApi(uri, 'reload').catch(error => {
        store.commit('reloadingFailed', uri)
        throw error
      })
    }

    // Reuse the existing promise from the store if possible
    return store.state[opts.apiName][uri]._meta.load || Promise.resolve(store.state[opts.apiName][uri])
  }

  /**
   * Loads the entity specified by the URI from the API and stores it into the Vuex store. Returns a promise
   * that resolves to the raw data stored in the Vuex store (needs to be resourceCreator.wrapped into a Resource before
   * being usable in Vue components).
   * @param uri       URI of the entity to load from the API
   * @param operation description of the operation triggering this load, e.g. fetch or reload, for error reporting
   * @returns Promise resolves to the raw data stored in the Vuex store after the API request completes, or
   *                  rejects when the API request fails
   */
  function loadFromApi (uri: string, operation: string): Promise<StoreData> {
    return axios.get(uri || '/').then(({ data }) => {
      if (opts.forceRequestedSelfLink) {
        data._links.self.href = uri
      }
      storeHalJsonData(data)
      return store.state[opts.apiName][uri]
    }, error => {
      throw handleAxiosError(operation, uri, error)
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
  async function href (uriOrEntity: string | ResourceInterface, relation: string, templateParams: Record<string, string | number | boolean> = {}): Promise<string | undefined> {
    const selfUri = normalizeEntityUri(await get(uriOrEntity)._meta.load, axios.defaults.baseURL)
    const rel = selfUri != null ? store.state[opts.apiName][selfUri][relation] : null
    if (!rel || !rel.href) return undefined
    if (rel.templated) {
      return urltemplate.parse(rel.href).expand(templateParams)
    }
    return rel.href
  }

  /**
   * Sends a PATCH request to the API, in order to update some fields in an existing entity.
   * @param uriOrEntity URI (or instance) of an entity which should be updated
   * @param data        Payload (fields to be updated) to be sent in the PATCH request
   * @returns Promise   resolves when the PATCH request has completed and the updated entity is available
   *                    in the Vuex store.
   */
  function patch (uriOrEntity: string | ResourceInterface, data: unknown): Promise<ResourceInterface> {
    const uri = normalizeEntityUri(uriOrEntity, axios.defaults.baseURL)
    if (uri === null) {
      return Promise.reject(new Error(`Could not perform PATCH, "${uriOrEntity}" is not an entity or URI`))
    }
    const existsInStore = !isUnknown(uri)

    if (existsInStore) {
      const entity = get(uri)
      if (isVirtualResource(entity)) {
        return Promise.reject(new Error('patch is not implemented for virtual resources'))
      }
    }

    if (!existsInStore) {
      store.commit('addEmpty', uri)
    }

    const returnedResource = axios.patch(uri || '/', data).then(({ data }) => {
      if (opts.forceRequestedSelfLink) {
        data._links.self.href = uri
      }
      storeHalJsonData(data)
      return get(uri)
    }, (error) => {
      throw handleAxiosError('patch', uri, error)
    })

    return returnedResource
  }

  /**
   * Removes a single entity from the Vuex store (but does not delete it using the API). Note that if the
   * entity is currently referenced and displayed through any other entity, the reactivity system will
   * immediately re-fetch the purged entity from the API in order to re-display it.
   * @param uriOrEntity URI (or instance) of an entity which should be removed from the Vuex store
   */
  function purge (uriOrEntity: string | ResourceInterface): void {
    const uri = normalizeEntityUri(uriOrEntity, axios.defaults.baseURL)
    if (uri === null) {
      // Can't purge an unknown URI, do nothing
      return
    }
    store.commit('purge', uri)
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
   * 2. Sends a DELETE request to the API in order to delete E (in case of failure, the
   *    deleted flag is reset and the operation is aborted)
   * 3. Finds all entities [...R] in the store that reference E (e.g. find the corresponding book when
   *    deleting a chapter) and reloads them from the API
   * 4. Purges E from the Vuex store
   * @param uriOrEntity URI (or instance) of an entity which should be deleted
   * @returns Promise   resolves when the DELETE request has completed and either all related entites have
   *                    been reloaded from the API, or the failed deletion has been cleaned up.
   */
  function del (uriOrEntity: string | ResourceInterface): Promise<void> {
    const uri = normalizeEntityUri(uriOrEntity, axios.defaults.baseURL)
    if (uri === null) {
      // Can't delete an unknown URI, do nothing
      return Promise.reject(new Error(`Could not perform DELETE, "${uriOrEntity}" is not an entity or URI`))
    }

    if (!isUnknown(uri)) {
      const entity = get(uri)
      if (isVirtualResource(entity)) {
        return Promise.reject(new Error('del is not implemented for virtual resources'))
      }
    }

    store.commit('deleting', uri)
    return axios.delete(uri || '/').then(
      () => deleted(uri),
      (error) => {
        store.commit('deletingFailed', uri)
        throw handleAxiosError('delete', uri, error)
      }
    )
  }

  function valueIsArrayWithReferenceTo (value: unknown, uri: string) {
    return Array.isArray(value) && value.some(entry => valueIsReferenceTo(entry, uri))
  }

  function valueIsReferenceTo (value: unknown, uri: string): boolean {
    if (value === null) return false
    if (typeof value !== 'object') return false

    const objectKeys = Object.keys(value as Record<string, unknown>)
    return objectKeys.length === 1 && objectKeys[0] === 'href' && (value as Link).href === uri
  }

  function findEntitiesReferencing (uri: string): Array<StoreData> {
    return Object.values(store.state[opts.apiName])
      .filter((entity) => {
        return Object.values(entity).some(propertyValue =>
          valueIsReferenceTo(propertyValue, uri) || valueIsArrayWithReferenceTo(propertyValue, uri)
        )
      })
  }

  /**
   * Cleans up the Vuex store after an entity is found to be deleted (HTTP status 204 or 404) from the API.
   * @param uri       URI of an entity which is not available (anymore) in the API
   * @returns Promise resolves when the cleanup has completed and the Vuex store is up to date again
   */
  function deleted (uri: string): Promise<void> {
    return Promise.all(findEntitiesReferencing(uri)
      // don't reload entities that are already being deleted, to break circular dependencies
      .filter(outdatedEntity => !outdatedEntity._meta.deleting)

      // reload outdated entities...
      .map(outdatedEntity => reload(outdatedEntity._meta.self).catch(() => {
        // ...but ignore any errors (such as 404 errors during reloading)
        // handleAxiosError will take care of recursively deleting cascade-deleted entities
      }))
    ).then(() => purge(uri))
  }

  /**
   * Normalizes raw data from the API and stores it into the Vuex store.
   * @param data HAL JSON data received from the API
   */
  function storeHalJsonData (data: Record<string, unknown>): void {
    const normalizedData = normalize(data, {
      camelizeKeys: false,
      metaKey: '_meta',
      normalizeUri: (uri: string) => normalizeEntityUri(uri, axios.defaults.baseURL),
      filterReferences: true,
      embeddedStandaloneListKey: 'items',
      virtualSelfLinks: true
    })
    store.commit('add', normalizedData)

    // sets dummy promise which immediately resolves to store data
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
    const promise: SerializablePromise<StoreData> = loadStoreData || Promise.resolve(store.state[opts.apiName][uri])
    promise.toJSON = () => '{}' // avoid warning in Nuxt when serializing the complete Vuex store ("Cannot stringify arbitrary non-POJOs Promise")

    store.commit('setLoadPromise', {
      uri,
      promise
    })
  }

  /**
   * Processes error object received from Axios for further usage. Triggers delete chain as side effect.
   * @param operation       Describes the action that was ongoing while the error happened, e.g. get or reload
   * @param uri             Requested URI that triggered the error
   * @param error           Raw error object received from Axios
   * @returns Error         Return new error object with human understandable error message
   */
  function handleAxiosError (operation: string, uri: string, error: AxiosError): Error {
    // Server Error (response received but with error code)
    if (error.response) {
      const response = error.response

      if (response.status === 404) {
        // 404 Entity not found error
        store.commit('deleting', uri)
        deleted(uri) // no need to wait for delete operation to finish
        return new ServerException(response, `Could not ${operation} "${uri}"`, error)
      } else if (response.status === 403) {
        // 403 Permission error
        return new ServerException(response, `No permission to ${operation} "${uri}"`, error)
      } else {
        // other unknown server error
        return new ServerException(response, `Error trying to ${operation} "${uri}"`, error)
      }
    } else {
      // another error
      error.message = `Error trying to ${operation} "${uri}": ${error.message}`
      return error
    }
  }

  const apiActions: ApiActions = { post, get, reload, del, patch, href, isUnknown }
  const halJsonVuex = { ...apiActions, purge, purgeAll, href, Resource, LoadingResource }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function install (app: any) {
    if (app.version && app.version.charAt(0) === '3') {
      Object.defineProperties(app.config.globalProperties, {
        [opts.apiName]: {
          get () {
            return halJsonVuex
          }
        }
      })
    } else {
      throw new Error('Vue2 detected: this version of hal-json-vuex is not compatible with Vue2')
    }
  }

  return { ...halJsonVuex, install }
}

export default HalJsonVuex
