import urltemplate from 'url-template'
import { isTemplatedLink, isVirtualLink, isEntityReference } from './halHelpers'
import ResourceInterface from './interfaces/ResourceInterface'
import ApiActions from './interfaces/ApiActions'
import { StoreData } from './interfaces/StoreData'
import ResourceCreator from './ResourceCreator'
import { InternalConfig } from './interfaces/Config'

/**
 * Represents an actual Resource, by wrapping the given Vuex store storeData. The storeData must not be loading.
 * If the storeData has been loaded into the store before but is currently reloading, the old storeData will be
 * returned, along with a ._meta.load promise that resolves when the reload is complete.
 */
class Resource implements ResourceInterface {
  public _meta: {
    self: string,
    selfUrl: string,
    load: Promise<ResourceInterface>
    loading: boolean
  }

  _storeData: StoreData
  config: InternalConfig
  apiActions: ApiActions

  /**
   * @param storeData fully loaded entity storeData from the Vuex store
   * @param apiActions inject dependency: API actions
   * @param resourceCreator inject dependency Resource factory
   * @param config inject dependency: config options
   */
  constructor (storeData: StoreData, apiActions: ApiActions, resourceCreator: ResourceCreator, config: InternalConfig) {
    this.apiActions = apiActions
    this.config = config
    this._storeData = storeData

    Object.keys(storeData)
      .filter(key => !['items', '_meta'].includes(key)) // exclude reserved properties
      .forEach(key => {
        const value = storeData[key]

        // storeData[key] is a virtual link (=embedded collection)
        if (isVirtualLink(value)) {
          this[key] = () => this.apiActions.get(value.href)

          // storeData[key] is a reference only (contains only href; no data)
        } else if (isEntityReference(value)) {
          this[key] = (_, options) => this.apiActions.get(value.href, options)

          // storeData[key] is a templated link
        } else if (isTemplatedLink(value)) {
          this[key] = (templateParams, options) => this.apiActions.get(urltemplate.parse(value.href).expand(templateParams || {}), options)

          // storeData[key] is a primitive (normal entity property)
        } else {
          this[key] = value
        }
      })

    // Use a trivial load promise to break endless recursion, except if we are currently reloading the storeData from the API
    const loadResource = storeData._meta.reloading
      ? (storeData._meta.load as Promise<StoreData>).then(reloadedData => resourceCreator.wrap(reloadedData))
      : Promise.resolve(this)

    // Use a shallow clone of _meta, since we don't want to overwrite the ._meta.load promise or self link in the Vuex store
    this._meta = {
      ...storeData._meta,
      load: loadResource,
      self: storeData._meta.self,
      selfUrl: this.config.apiRoot + storeData._meta.self
    }
  }

  $reload (): Promise<ResourceInterface> {
    return this.apiActions.reload(this)
  }

  $post (data: unknown): Promise<ResourceInterface | null> {
    return this.apiActions.post(this._meta.self, data)
  }

  $patch (data: unknown): Promise<ResourceInterface> {
    return this.apiActions.patch(this._meta.self, data)
  }

  $del (): Promise<string | void> {
    return this.apiActions.del(this._meta.self)
  }

  $href (relation: string, templateParams: Record<string, string | number | boolean> = {}): Promise<string | undefined> {
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

export default Resource
