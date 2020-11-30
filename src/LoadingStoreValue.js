import LoadingStoreCollection from './LoadingStoreCollection'

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
class LoadingStoreValue {
  constructor (entityLoaded, absoluteSelf = null) {
    const handler = {
      get: function (target, prop, _) {
        if (prop === Symbol.toPrimitive) {
          return () => ''
        }
        if (['then', 'toJSON', Symbol.toStringTag, 'state', 'getters', '$options', '_isVue', '__file', 'render', 'constructor'].includes(prop)) {
          // This is necessary so that Vue's reactivity system understands to treat this LoadingStoreValue
          // like a normal object.
          return undefined
        }
        if (prop === 'loading') {
          return true
        }
        if (prop === 'load') {
          return entityLoaded
        }
        if (prop === 'self') {
          return absoluteSelf
        }
        if (prop === '_meta') {
          // When _meta is requested on a LoadingStoreValue, we keep on using the unmodified promise, because
          // ._meta.load is supposed to resolve to the whole object, not just the ._meta part of it
          return new LoadingStoreValue(entityLoaded, absoluteSelf)
        }
        const propertyLoaded = entityLoaded.then(entity => entity[prop])
        if (['items', 'allItems'].includes(prop)) {
          return new LoadingStoreCollection(propertyLoaded)
        }
        // Normal property access: return a function that yields another LoadingStoreValue and renders as empty string
        const result = templateParams => new LoadingStoreValue(propertyLoaded.then(property => property(templateParams)._meta.load))
        result.loading = true
        result.toString = () => ''
        return result
      }
    }
    return new Proxy(this, handler)
  }
}

export default LoadingStoreValue
