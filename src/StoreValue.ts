import urltemplate from 'url-template'
import { isTemplatedLink, isEntityReference, isCollection } from './halHelpers'
import { QueryablePromise, createResolvedPromise, wrapPromise } from './QueryablePromise'
import EmbeddedCollection from './EmbeddedCollection'
import CanHaveItems from './CanHaveItems'
import Resource from './interfaces/Resource'
import ApiActions from './interfaces/ApiActions'
import StoreData from './interfaces/StoreData'
import StoreValueCreator from './StoreValueCreator'
import { InternalConfig } from './interfaces/Config'

/**
 * Creates an actual StoreValue, by wrapping the given Vuex store storeData. The storeData must not be loading.
 * If the storeData has been loaded into the store before but is currently reloading, the old storeData will be
 * returned, along with a ._meta.load promise that resolves when the reload is complete.
 * @param storeData fully loaded entity storeData from the Vuex store
 */
class StoreValue extends CanHaveItems implements Resource {
  public _meta: {
    self: string,
    load: QueryablePromise<Resource>
    loading: boolean
  }

  private storeData: StoreData
  config: InternalConfig
  apiActions: ApiActions

  constructor (storeData: StoreData, apiActions: ApiActions, storeValueCreator: StoreValueCreator, config: InternalConfig) {
    if (isCollection(storeData)) {
      super(apiActions, config, storeData.items, storeData._meta.self, 'items')
    } else {
      super(apiActions, config, [], '', '') // TODO: consider implementing CanHaveItems as mixin, then call super constructor is not necessary for non-collections
    }

    this.apiActions = apiActions
    this.config = config
    this.storeData = storeData

    Object.keys(storeData)
      .filter(key => !['items', '_meta'].includes(key)) // exclude reserved properties
      .forEach(key => {
        const value = storeData[key]

        // storeData[key] is an embedded collection
        if (Array.isArray(value)) {
          this[key] = () => new EmbeddedCollection(value, storeData._meta.self, key, this.apiActions, config, storeData._meta.load)

          // storeData[key] is a reference only (contains only href; no data)
        } else if (isEntityReference(value)) {
          this[key] = () => this.apiActions.get(value.href)

          // storeData[key] is a templated link
        } else if (isTemplatedLink(value)) {
          this[key] = templateParams => this.apiActions.get(urltemplate.parse(value.href).expand(templateParams || {}))

          // storeData[key] is a primitive (normal entity property)
        } else {
          this[key] = value
        }
      })

    // Use a trivial load promise to break endless recursion, except if we are currently reloading the storeData from the API
    const loadPromise = storeData._meta.load && storeData._meta.load.isPending()
      ? wrapPromise(storeData._meta.load.then(reloadedData => (storeValueCreator.wrap(reloadedData) as Resource)))
      : createResolvedPromise(this)

    // Use a shallow clone of _meta, since we don't want to overwrite the ._meta.load promise or self link in the Vuex store
    this._meta = {
      ...storeData._meta,
      load: loadPromise,
      self: this.config.apiRoot + storeData._meta.self
    }
  }

  $reload (): Promise<Resource> {
    return this.apiActions.reload(this._meta.self)
  }

  $loadItems (): Promise<Resource> {
    return this._meta.load
  }

  $post (data: unknown): Promise<Resource> {
    return this.apiActions.post(this._meta.self, data)
  }

  $patch (data: unknown): Promise<Resource> {
    return this.apiActions.patch(this._meta.self, data)
  }

  $del (): Promise<string | void> {
    return this.apiActions.del(this._meta.self)
  }
}

export default StoreValue
