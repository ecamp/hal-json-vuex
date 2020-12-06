import LoadingStoreCollection from './LoadingStoreCollection'
import Resource from './interfaces/Resource'
import { QueryablePromise, wrapPromise } from './QueryablePromise'

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
 *
 * @param entityLoaded a Promise that resolves to a StoreValue when the entity has finished
 *                     loading from the API
 * @param absoluteSelf optional fully qualified URI of the entity being loaded, if available. If passed, the
 *                     returned LoadingStoreValue will return it in calls to .self and ._meta.self
 */
class LoadingStoreValue implements Resource {
  public _meta: {
    self: string | null,
    load: QueryablePromise<Resource>
    loading: boolean
  }

  private loadResourceSafely: Promise<Resource>

  constructor (entityLoaded: Promise<Resource>, absoluteSelf: string | null = null) {
    this._meta = {
      self: absoluteSelf,
      load: wrapPromise(entityLoaded),
      loading: true
    }

    // safe load: if API call fails, suppress errors and present this Proxy again to the chain
    const loadResourceSafely = entityLoaded.catch(() => this)
    this.loadResourceSafely = loadResourceSafely

    const handler = {
      get: function (target: LoadingStoreValue, prop: string | number | symbol) {
        // TODO docu: Why is this neede?
        if (prop === Symbol.toPrimitive) {
          return () => ''
        }

        // This is necessary so that Vue's reactivity system understands to treat this LoadingStoreValue
        // like a normal object.
        if (['then', 'toJSON', Symbol.toStringTag, 'state', 'getters', '$options', '_isVue', '__file', 'render', 'constructor'].includes(prop as string)) {
          return undefined
        }

        // proxy to properties that actually exist on LoadingStoreValue (_meta, $reload, etc.)
        if (Reflect.has(target, prop)) {
          return Reflect.get(target, prop)
        }

        // Proxy to all other unknown properties: return a function that yields another LoadingStoreValue
        const loadProperty = loadResourceSafely.then(resource => resource[prop])
        const result = templateParams => new LoadingStoreValue(loadProperty.then(property => property(templateParams)._meta.load))
        return result
      }
    }
    return new Proxy(this, handler)
  }

  public toString (): string {
    return ''
  }

  get items (): Array<Resource> {
    return LoadingStoreCollection.create(this.loadResourceSafely.then(entity => entity.items))
  }

  get allItems (): Array<Resource> {
    return LoadingStoreCollection.create(this.loadResourceSafely.then(entity => entity.allItems))
  }

  public $reload (): Promise<Resource> {
    // Skip reloading entities that are already loading
    return this._meta.load
  }

  public $loadItems (): Promise<Resource> {
    return this._meta.load
  }

  public $post (data: unknown):Promise<Resource> {
    return this._meta.load.then(resource => resource.$post(data))
  }

  public $patch (data: unknown): Promise<Resource> {
    return this._meta.load.then(resource => resource.$patch(data))
  }

  public $del (): Promise<string | void> {
    return this._meta.load.then(resource => resource.$del())
  }
}

export default LoadingStoreValue
