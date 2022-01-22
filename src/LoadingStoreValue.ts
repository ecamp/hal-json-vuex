import LoadingStoreCollection from './LoadingStoreCollection'
import Resource from './interfaces/Resource'
import Collection from './interfaces/Collection'

/**
 * Creates a placeholder for an entity which has not yet finished loading from the API.
 * Such a LoadingStoreValue can safely be used in Vue components, since it will render as an empty
 * string and Vue's reactivity system will replace it with the real data once that is available.
 *
 * Accessing nested functions in a LoadingStoreValue yields another LoadingStoreValue:
 * new LoadingStoreValue(...).author().organization() // gives another LoadingStoreValue
 *
 * Using a LoadingStoreValue or a property of a LoadingStoreValue in a view renders to empty strings:
 * let user = new LoadingStoreValue(...)
 * 'The "' + user + '" is called "' + user.name + '"' // gives 'The "" is called ""'
 */
class LoadingStoreValue implements Resource {
  public _meta: {
    self: string | null,
    load: Promise<Resource>
    loading: boolean
  }

  private loadResource: Promise<Resource>

  /**
   * @param entityLoaded a Promise that resolves to a StoreValue when the entity has finished
   *                     loading from the API
   * @param absoluteSelf optional fully qualified URI of the entity being loaded, if available. If passed, the
   *                     returned LoadingStoreValue will return it in calls to .self and ._meta.self
   */
  constructor (loadResource: Promise<Resource>, absoluteSelf: string | null = null) {
    this._meta = {
      self: absoluteSelf,
      load: loadResource,
      loading: true
    }

    this.loadResource = loadResource

    const handler = {
      get: function (target: LoadingStoreValue, prop: string | number | symbol) {
        // This is necessary so that Vue's reactivity system understands to treat this LoadingStoreValue
        // like a normal object.
        if (prop === Symbol.toPrimitive) {
          return () => ''
        }

        // This is necessary so that Vue's reactivity system understands to treat this LoadingStoreValue
        // like a normal object.
        if (['then', Symbol.toStringTag, 'state', 'getters', '$options', '_isVue', '__file', 'render', 'constructor'].includes(prop as string)) {
          return undefined
        }

        // proxy to properties that actually exist on LoadingStoreValue (_meta, $reload, etc.)
        if (Reflect.has(target, prop)) {
          return Reflect.get(target, prop)
        }

        // Proxy to all other unknown properties: return a function that yields another LoadingStoreValue
        const loadProperty = loadResource.then(resource => resource[prop])

        const result = templateParams => new LoadingStoreValue(loadProperty.then(property => {
          try {
            return property(templateParams)._meta.load
          } catch (e) {
            throw new Error(`Property '${prop.toString()}' on resource ${absoluteSelf} was used like a relation, but no relation with this name was returned by the API (actual return value: ${JSON.stringify(property)})`)
          }
        }
        ))

        result.toString = () => ''
        return result
      }
    }
    return new Proxy(this, handler)
  }

  get items (): Array<Resource> {
    return LoadingStoreCollection.create(this.loadResource.then(resource => (resource as Collection).items))
  }

  get allItems (): Array<Resource> {
    return LoadingStoreCollection.create(this.loadResource.then(resource => (resource as Collection).allItems))
  }

  public $reload (): Promise<Resource> {
    // Skip reloading entities that are already loading
    return this._meta.load
  }

  public $loadItems (): Promise<Collection> {
    return this._meta.load.then(resource => (resource as Collection).$loadItems())
  }

  public $post (data: unknown): Promise<Resource | null> {
    return this._meta.load.then(resource => resource.$post(data))
  }

  public $patch (data: unknown): Promise<Resource> {
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

export default LoadingStoreValue
