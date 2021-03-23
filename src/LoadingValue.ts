import LoadingArray from './LoadingArray'
import Resource, { CollectionResource } from "@/interfaces/Resource";
import StoreValue from "@/StoreValue";

/**
 * A placeholder for an entity which has not yet finished loading from the API.
 * Such a LoadingValue can safely be used in Vue components, since it will render as an empty
 * string and Vue's reactivity system will replace it with the real data once that is available.
 *
 * Accessing nested functions in a LoadingValue yields another LoadingValue:
 * new LoadingValue(...).author().organization() // gives another LoadingValue
 *
 * Using a LoadingValue or a property of a LoadingValue in a view renders to empty strings:
 * let user = new LoadingValue(...)
 * 'The "' + user + '" is called "' + user.name + '"' // gives 'The "" is called ""'
 */
class LoadingValue<T> {
  public _meta: {
    self: string | null,
    load: Promise<T>
    loading: boolean
  }
  protected loadResource: Promise<T>

  /**
   * @param loadResource a Promise that resolves to a TBase when the entity has finished
   *                     loading from the API
   * @param absoluteSelf optional fully qualified URI of the entity being loaded, if available. If passed, the
   *                     returned LoadingValue will return it in calls to .self and ._meta.self
   */
  constructor(loadResource: Promise<T>, absoluteSelf: string | null = null) {

    this._meta = {
      self: absoluteSelf,
      load: loadResource,
      loading: true
    }
    this.loadResource = loadResource

    const handler = {
      get<U>(target: LoadingValue<U>, prop: string | number | symbol): LoadingValue<U> | Function | undefined {
        // Necessary for Vue's reactivity system
        if (prop === Symbol.toPrimitive) {
          return () => ''
        }

        // This is necessary so that Vue's reactivity system understands to treat this LoadingValue
        // like a normal object.
        if (['then', 'toJSON', Symbol.toStringTag, 'state', 'getters', '$options', '_isVue', '__file', 'render', 'constructor'].includes(prop as string)) {
          return undefined
        }

        // proxy to properties that actually exist on LoadingValue (_meta, $reload, etc.)
        if (Reflect.has(target, prop)) {
          return Reflect.get(target, prop)
        }

        // Proxy to all other unknown properties: return a function that yields another LoadingValue
        const loadProperty = loadResource.then(resource => resource[prop])
        const result = templateParams => new LoadingValue(loadProperty.then(property => property(templateParams)._meta.load))
        result.toString = () => ''
        return result
      }
    }
    return new Proxy(this, handler) as LoadingValue<T>
  }
}

class LoadingResource extends LoadingValue<StoreValue> implements Resource {
  public $reload (): Promise<Resource> {
    // Skip reloading entities that are already loading
    return this._meta.load
  }

  public $post (data: unknown): Promise<Resource> {
    return this._meta.load.then(resource => resource.$post(data))
  }

  public $patch (data: unknown): Promise<Resource> {
    return this._meta.load.then(resource => resource.$patch(data))
  }

  public $del (): Promise<string | void> {
    return this._meta.load.then(resource => resource.$del())
  }
}

class LoadingCollection extends LoadingValue<Collection> implements CollectionResource {
  public $reload (): Promise<Resource> {
    // Skip reloading entities that are already loading
    return this._meta.load
  }

  public $post (data: unknown): Promise<Resource> {
    return this._meta.load.then(resource => resource.$post(data))
  }

  public $patch (data: unknown): Promise<Resource> {
    return this._meta.load.then(resource => resource.$patch(data))
  }

  public $del (): Promise<string | void> {
    return this._meta.load.then(resource => resource.$del())
  }

  get items (): LoadingArray<Resource> {
    return new LoadingArray<Resource>(this.loadResource.then(entity => entity.items))
  }

  get allItems (): LoadingArray<Resource> {
    return new LoadingArray(this.loadResource.then(entity => entity.allItems))
  }

  public $loadItems (): Promise<Resource> {
    return this._meta.load
  }
}

export default LoadingValue
export { LoadingValue, LoadingResource }
