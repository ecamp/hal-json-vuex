import { parseTemplate } from 'url-template'

import type ResourceInterface from './interfaces/ResourceInterface'
import type { ApiActions } from './interfaces/Interfaces'
import type { StoreData, StoreDataEntity } from './interfaces/StoreData'
import type { InternalConfig } from './interfaces/Config'
import { isTemplatedLink, isVirtualLink, isEntityReference } from './halHelpers'
import ResourceCreator from './ResourceCreator'

/**
 * Represents an actual Resource, by wrapping the given Vuex store storeData. The storeData must not be loading.
 * If the storeData has been loaded into the store before but is currently reloading, the old storeData will be
 * returned, along with a ._meta.load promise that resolves when the reload is complete.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class Resource<ResourceType extends ResourceInterface, StoreType extends StoreData<ResourceType> = StoreDataEntity<ResourceType>> implements ResourceInterface<ResourceType> {
  public _meta: {
    self: string,
    selfUrl: string,
    load: Promise<ResourceType>
    loading: boolean
  }

  _storeData: StoreType
  config: InternalConfig
  apiActions: ApiActions

  /**
   * @param storeData fully loaded entity storeData from the Vuex store
   * @param apiActions inject dependency: API actions
   * @param resourceCreator inject dependency Resource factory
   * @param config inject dependency: config options
   */
  constructor (storeData: StoreType, apiActions: ApiActions, resourceCreator: ResourceCreator, config: InternalConfig) {
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
          this[key] = () => this.apiActions.get(value.href)

          // storeData[key] is a templated link
        } else if (isTemplatedLink(value)) {
          this[key] = templateParams => this.apiActions.get(parseTemplate(value.href).expand(templateParams || {}))

          // storeData[key] is a primitive (normal entity property)
        } else {
          this[key] = value
        }
      })

    // Use a trivial load promise to break endless recursion, except if we are currently reloading the storeData from the API
    const loadResource = storeData._meta.reloading
      ? storeData._meta.load.then(reloadedData => resourceCreator.wrap(reloadedData))
      : Promise.resolve(this)

    // Use a shallow clone of _meta, since we don't want to overwrite the ._meta.load promise or self link in the Vuex store
    this._meta = {
      ...storeData._meta,
      load: loadResource,
      self: storeData._meta.self,
      selfUrl: this.config.apiRoot + storeData._meta.self
    }
  }

  $reload (): Promise<ResourceType> {
    return this.apiActions.reload(this)
  }

  $post (data: unknown): Promise<ResourceType | null> {
    return this.apiActions.post(this._meta.self, data)
  }

  $patch (data: unknown): Promise<ResourceType> {
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
   * this avoids warnings in Nuxt "Cannot stringify arbitrary non-POJOs"
   */
  toJSON (): string {
    // for the lack of any better alternative, return store data as JSON
    // alternatively: could also return '{}', as the data cannot be used directly, anyway
    return JSON.stringify(this._storeData)
  }
}

export default Resource
