import urltemplate from 'url-template'
import { isTemplatedLink, isVirtualLink, isEntityReference } from './halHelpers'
import EmbeddedCollection from './EmbeddedCollection'
import Resource from './interfaces/Resource'
import ApiActions from './interfaces/ApiActions'
import { StoreData, StoreDataEntity } from './interfaces/StoreData'
import Collection from './interfaces/Collection'
import StoreValueCreator from './StoreValueCreator'
import { InternalConfig } from './interfaces/Config'
import HasItems from './HasItems'

/**
 * Represents an actual StoreValue, by wrapping the given Vuex store storeData. The storeData must not be loading.
 * If the storeData has been loaded into the store before but is currently reloading, the old storeData will be
 * returned, along with a ._meta.load promise that resolves when the reload is complete.
 */
class StoreValue implements Resource {
  public _meta: {
    self: string,
    load: Promise<Resource>
    loading: boolean
  }

  _storeData: StoreData
  config: InternalConfig
  apiActions: ApiActions

  /**
   * @param storeData fully loaded entity storeData from the Vuex store
   * @param apiActions inject dependency: API actions
   * @param storeValueCreator inject dependency StoreValue factory
   * @param config inject dependency: config options
   */
  constructor (storeData: StoreData, apiActions: ApiActions, storeValueCreator: StoreValueCreator, config: InternalConfig) {
    this.apiActions = apiActions
    this.config = config
    this._storeData = storeData

    Object.keys(storeData)
      .filter(key => !['items', '_meta'].includes(key)) // exclude reserved properties
      .forEach(key => {
        const value = storeData[key]

        // storeData[key] is a virtual link (=embedded collection)
        if (isVirtualLink(value)) {
          // build complete Collection class = EmbeddedCollection + HasItems mixin
          const EmbeddedCollectionClass = HasItems(EmbeddedCollection, this.apiActions, this.config, storeData._meta.self, key)

          const loadCollection = storeData._meta.load
            ? (storeData._meta.load as Promise<StoreDataEntity>).then(() => {
                const collection = this.apiActions.get(value.href) as Collection
                return new EmbeddedCollectionClass(collection, storeData._meta.self, key)
              })
            : null

          const collection = this.apiActions.get(value.href) as Collection
          this[key] = () => new EmbeddedCollectionClass(collection, storeData._meta.self, key, loadCollection)

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
    const loadResource = storeData._meta.reloading
      ? (storeData._meta.load as Promise<StoreData>).then(reloadedData => storeValueCreator.wrap(reloadedData))
      : Promise.resolve(this)

    // Use a shallow clone of _meta, since we don't want to overwrite the ._meta.load promise or self link in the Vuex store
    this._meta = {
      ...storeData._meta,
      load: loadResource,
      self: this.config.apiRoot + storeData._meta.self
    }
  }

  $reload (): Promise<Resource> {
    return this.apiActions.reload(this._meta.self)
  }

  $post (data: unknown): Promise<Resource | null> {
    return this.apiActions.post(this._meta.self, data)
  }

  $patch (data: unknown): Promise<Resource> {
    return this.apiActions.patch(this._meta.self, data)
  }

  $del (): Promise<string | void> {
    return this.apiActions.del(this._meta.self)
  }

  $href (relation: string, templateParams = {}): Promise<string | undefined> {
    return this.apiActions.href(this, relation, templateParams)
  }

  /**
   * Serialize object to JSON
   * this avoid warnings in Nuxt "Cannot stringify arbitrary non-POJOs"
   */
  toJSON (): string {
    // for the lack of any better alternative, return store data as JSON
    // alternatively: could also return '{}', as the data cannot be used directly, anyway
    return JSON.stringify(this._storeData)
  }
}

export default StoreValue
