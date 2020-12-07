import StoreValue from './StoreValue'
import LoadingStoreValue from './LoadingStoreValue'
import ApiActions from './interfaces/ApiActions'
import { InternalConfig } from './interfaces/Config'
import StoreData from './interfaces/StoreData'
import Resource from './interfaces/Resource'
import { wrapPromise } from './QueryablePromise'

class StoreValueCreator {
  private config: InternalConfig
  private apiActions: ApiActions

  constructor ({ get, reload, post, patch, del, isUnknown }: ApiActions, config: InternalConfig = {}) {
    this.apiActions = { get, reload, post, patch, del, isUnknown }
    this.config = config
  }

  /**
   * Takes data from the Vuex store and makes it more usable in frontend components. The data stored
   * in the Vuex store should always be JSON serializable according to
   * https://github.com/vuejs/vuex/issues/757#issuecomment-297668640. Therefore, we wrap the data into
   * a new object, and provide accessor methods for related entities. Such an accessor method fetches the
   * related entity from the Vuex store (or the API if necessary) when called. In case the related entity
   * is still being loaded from the API, a LoadingStoreValue is returned.
   *
   * Example:
   * // Data of an entity like it comes from the Vuex store:
   * let storeData = {
   *   numeric_property: 3,
   *   reference_to_other_entity: {
   *     href: '/uri/of/other/entity'
   *   },
   *   _meta: {
   *     self: '/self/uri'
   *   }
   * }
   * // Apply StoreValue
   * let usable = storeValue(...)(storeData)
   * // Now we can use accessor methods
   * usable.reference_to_other_entity() // returns the result of this.api.get('/uri/of/other/entity')
   *
   * @param data                entity data from the Vuex store
   * @returns object            wrapped entity ready for use in a frontend component
   */
  wrap (data: StoreData): Resource {
    const meta = data._meta || { load: Promise.resolve(), loading: false }

    if (meta.loading) {
      const entityLoaded = wrapPromise(meta.load.then(loadedData => new StoreValue(loadedData, this.apiActions, this, this.config)))
      return new LoadingStoreValue(entityLoaded, this.config.apiRoot + meta.self)
    }

    return new StoreValue(data, this.apiActions, this, this.config)
  }
}

export default StoreValueCreator
