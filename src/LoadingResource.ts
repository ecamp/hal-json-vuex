import LoadingCollection from './LoadingCollection'
import ResourceInterface from './interfaces/ResourceInterface'
import CollectionInterface from './interfaces/CollectionInterface'
import { InternalConfig } from './interfaces/Config'
import { isCollectionInterface } from './halHelpers'

/**
 * Creates a placeholder for an entity which has not yet finished loading from the API.
 * Such a LoadingResource can safely be used in Vue components, since it will render as an empty
 * string and Vue's reactivity system will replace it with the real data once that is available.
 *
 * Accessing nested functions in a LoadingResource yields another LoadingResource:
 * new LoadingResource(...).author().organization() // gives another LoadingResource
 *
 * Using a LoadingResource or a property of a LoadingResource in a view renders to empty strings:
 * let user = new LoadingResource(...)
 * 'The "' + user + '" is called "' + user.name + '"' // gives 'The "" is called ""'
 */
class LoadingResource<ResourceType extends (ResourceInterface | CollectionInterface<ResourceType>)> implements ResourceInterface<ResourceType> {
  public _meta: {
    self: string | null,
    selfUrl: string | null,
    load: Promise<ResourceType>
    loading: boolean
  }

  private loadResource: Promise<ResourceType>

  /**
   * @param loadResource a Promise that resolves to a Resource when the entity has finished
   *                     loading from the API
   * @param self optional URI of the entity being loaded, if available. If passed, the
   *                     returned LoadingResource will return it in calls to .self and ._meta.self
   * @param config       configuration of this instance of hal-json-vuex
   */
  constructor (loadResource: Promise<ResourceType>, self: string | null = null, config: InternalConfig | null = null) {
    this._meta = {
      self: self,
      selfUrl: self ? config?.apiRoot + self : null,
      load: loadResource,
      loading: true
    }

    this.loadResource = loadResource

    const handler = {
      get: function (target: LoadingResource<ResourceType>, prop: string | number | symbol) {
        // This is necessary so that Vue's reactivity system understands to treat this LoadingResource
        // like a normal object.
        if (prop === Symbol.toPrimitive) {
          return () => ''
        }

        // This is necessary so that Vue's reactivity system understands to treat this LoadingResource
        // like a normal object.
        if (['then', Symbol.toStringTag, 'state', 'getters', '$options', '_isVue', '__file', 'render', 'constructor'].includes(prop as string)) {
          return undefined
        }

        // proxy to properties that actually exist on LoadingResource (_meta, $reload, etc.)
        if (Reflect.has(target, prop)) {
          return Reflect.get(target, prop)
        }

        // Proxy to all other unknown properties: return a function that yields another LoadingResource
        const loadProperty = loadResource.then(resource => resource[prop])

        const result = templateParams => new LoadingResource(loadProperty.then(property => {
          try {
            return property(templateParams)._meta.load
          } catch (e) {
            throw new Error(`Property '${prop.toString()}' on resource '${self}' was used like a relation, but no relation with this name was returned by the API (actual return value: ${JSON.stringify(property)})`)
          }
        }
        ))

        result.toString = () => ''
        return result
      }
    }
    return new Proxy(this, handler)
  }

  get items (): Array<ResourceType> {
    return LoadingCollection.create(this.loadResource.then(resource => (resource as CollectionInterface<ResourceType>).items))
  }

  get allItems (): Array<ResourceType> {
    return LoadingCollection.create(this.loadResource.then(resource => (resource as CollectionInterface<ResourceType>).allItems))
  }

  public $reload (): Promise<ResourceType> {
    // Skip reloading entities that are already loading
    return this._meta.load
  }

  public $loadItems (): Promise<CollectionInterface<ResourceType>> {
    return this._meta.load.then((resource) => {
      if (isCollectionInterface<ResourceType>(resource)) {
        return resource.$loadItems()
      }
      throw new Error('This LoadingResource is not a collection')
    })
  }

  public $post (data: unknown): Promise<ResourceType | null> {
    return this._meta.load.then(resource => resource.$post(data))
  }

  public $patch (data: unknown): Promise<ResourceType> {
    return this._meta.load.then(resource => resource.$patch(data))
  }

  public $del (): Promise<string | void> {
    return this._meta.load.then(resource => resource.$del())
  }

  public $href (relation: string, templateParams = {}): Promise<string | undefined> {
    return this._meta.load.then(resource => resource.$href(relation, templateParams))
  }

  public toJSON (): string {
    return '{}'
  }
}

export default LoadingResource
