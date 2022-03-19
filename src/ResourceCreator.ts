import Resource from './Resource'
import LoadingResource from './LoadingResource'
import ApiActions from './interfaces/ApiActions'
import { InternalConfig } from './interfaces/Config'
import { StoreData } from './interfaces/StoreData'
import ResourceInterface from './interfaces/ResourceInterface'
import Collection from './Collection'
import { isCollection } from './halHelpers'

class ResourceCreator {
  private config: InternalConfig
  private apiActions: ApiActions

  constructor ({ get, reload, post, patch, href, del, isUnknown }: ApiActions, config: InternalConfig = {}) {
    this.apiActions = { get, reload, post, patch, href, del, isUnknown }
    this.config = config
  }

  /**
   * Takes data from the Vuex store and makes it more usable in frontend components. The data stored
   * in the Vuex store should always be JSON serializable according to
   * https://github.com/vuejs/vuex/issues/757#issuecomment-297668640. Therefore, we wrap the data into
   * a new object, and provide accessor methods for related entities. Such an accessor method fetches the
   * related entity from the Vuex store (or the API if necessary) when called. In case the related entity
   * is still being loaded from the API, a LoadingResource is returned.
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
   * // Apply Resource
   * let usable = storeValue(...)(storeData)
   * // Now we can use accessor methods
   * usable.reference_to_other_entity() // returns the result of this.api.get('/uri/of/other/entity')
   *
   * @param data                entity data from the Vuex store
   * @returns object            wrapped entity ready for use in a frontend component
   */
  wrap (data: StoreData): ResourceInterface {
    const meta = data._meta || { load: Promise.resolve(), loading: false }

    // Resource is loading --> return LoadingResource
    if (meta.loading) {
      const loadResource = (meta.load as Promise<StoreData>).then(storeData => this.wrapData(storeData))
      return new LoadingResource(loadResource, meta.self, this.config)

    // Resource is not loading --> wrap actual data
    } else {
      return this.wrapData(data)
    }
  }

  wrapData (data: StoreData): ResourceInterface {
    // Store data looks like a collection --> return CollectionInterface
    if (isCollection(data)) {
      return new Collection(data, this.apiActions, this, this.config) // these parameters are passed to Resource constructor

    // else Store Data looks like an entity --> return normal Resource
    } else {
      return new Resource(data, this.apiActions, this, this.config)
    }
  }
}

export default ResourceCreator
