import urltemplate from 'url-template'

import { isTemplatedLink, isEntityReference, isCollection } from './halHelpers.js'

import QueryablePromise from './QueryablePromise.js'

export default function storeValueCreator (apiRoot, { get, reload, post, patch, del, isUnknown }, opts = {}) {
  /**
   * Takes data from the Vuex store and makes it more usable in frontend components. The data stored
   * in the Vuex store should always be JSON serializable according to
   * https://github.com/vuejs/vuex/issues/757#issuecomment-297668640. Therefore, we wrap the data into
   * a new object, and provide accessor methods for related entities. Such an accessor method fetches the
   * related entity from the Vuex store (or the API if necessary) when called. In case the related entity
   * is still being loaded from the API, a LoadingStoreValue is returned.
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
   * // Apply StoreValue
   * let usable = storeValue(...)(storeData)
   * // Now we can use accessor methods
   * usable.reference_to_other_entity() // returns the result of this.api.get('/uri/of/other/entity')
   *
   * @param data                entity data from the Vuex store
   * @returns object            wrapped entity ready for use in a frontend component
   */
  function wrap (data) {
    const meta = data._meta || { load: Promise.resolve() }

    if (meta.loading) {
      const entityLoaded = meta.load.then(loadedData => new StoreValue(loadedData))
      return new LoadingStoreValue(entityLoaded, meta.self)
    }

    return new StoreValue(data)
  }

  class CanHaveItems {
    /**
     * Defines a property getter for the items property.
     * The items property should always be a getter, in order to make the call to mapArrayOfEntityReferences
     * lazy, since that potentially fetches a large number of entities from the API.
     * @param items       array of items, which can be mixed primitive values and entity references
     * @param fetchAllUri URI that allows fetching all collection items in a single network request, if known
     * @param property    property name inside the entity fetched at fetchAllUri that contains the collection
     * @returns object the target object with the added getter
     */
    addItemsGetter (items, fetchAllUri, property) {
      Object.defineProperty(this, 'items', { get: () => this.filterDeleting(this.mapArrayOfEntityReferences(items, fetchAllUri, property)) })
      Object.defineProperty(this, 'allItems', { get: () => this.mapArrayOfEntityReferences(items, fetchAllUri, property) })
    }

    filterDeleting (array) {
      return array.filter(entry => !entry._meta.deleting)
    }

    /**
     * Given an array, replaces any entity references in the array with the entity loaded from the Vuex store
     * (or from the API if necessary), and returns that as a new array. In case some of the entity references in
     * the array have not finished loading yet, returns a LoadingStoreCollection instead.
     * @param array            possibly mixed array of values and references
     * @param fetchAllUri      URI that allows fetching all array items in a single network request, if known
     * @param fetchAllProperty property in the entity from fetchAllUri that will contain the array
     * @returns array          the new array with replaced items, or a LoadingStoreCollection if any of the array
     *                         elements is still loading.
     */
    mapArrayOfEntityReferences (array, fetchAllUri, fetchAllProperty) {
      if (!this.containsUnknownEntityReference(array)) {
        return this.replaceEntityReferences(array)
      }

      if (opts.avoidNPlusOneRequests) {
        const completelyLoaded = reload({ _meta: { reload: { uri: fetchAllUri, property: fetchAllProperty } } }, true)
          .then(() => this.replaceEntityReferences(array))
        return new LoadingStoreCollection(completelyLoaded)
      } else {
        const arrayWithReplacedReferences = this.replaceEntityReferences(array)
        const arrayCompletelyLoaded = Promise.all(array.map(entry => {
          if (isEntityReference(entry)) {
            return get(entry.href)._meta.load
          }
          return Promise.resolve(entry)
        }))
        return new LoadingStoreCollection(arrayCompletelyLoaded, arrayWithReplacedReferences)
      }
    }

    replaceEntityReferences (array) {
      return array.map(entry => {
        if (isEntityReference(entry)) {
          return get(entry.href)
        }
        return entry
      })
    }

    containsUnknownEntityReference (array) {
      return array.some(entry => isEntityReference(entry) && isUnknown(entry.href))
    }
  }

  /**
   * Creates an actual StoreValue, by wrapping the given Vuex store data. The data must not be loading.
   * If the data has been loaded into the store before but is currently reloading, the old data will be
   * returned, along with a ._meta.load promise that resolves when the reload is complete.
   * @param data fully loaded entity data from the Vuex store
   */
  class StoreValue extends CanHaveItems {
    constructor (data) {
      super()
      Object.keys(data).forEach(key => {
        const value = data[key]
        if (key === 'allItems' && isCollection(data)) return
        if (key === 'items' && isCollection(data)) {
          this.addItemsGetter(data[key], data._meta.self, key)
        } else if (Array.isArray(value)) {
          this[key] = () => new EmbeddedCollection(value, data._meta.self, key, data._meta.load)
        } else if (isEntityReference(value)) {
          this[key] = () => get(value.href)
        } else if (isTemplatedLink(value)) {
          this[key] = templateParams => get(urltemplate.parse(value.href).expand(templateParams || {}))
        } else {
          this[key] = value
        }
      })

      // Use a trivial load promise to break endless recursion, except if we are currently reloading the data from the API
      const loadedPromise = data._meta.load && !data._meta.load[Symbol.for('done')]
        ? data._meta.load.then(reloadedData => wrap(reloadedData))
        : QueryablePromise.resolve(this)

      // Use a shallow clone of _meta, since we don't want to overwrite the ._meta.load promise or self link in the Vuex store
      this._meta = { ...data._meta, load: loadedPromise, self: apiRoot + data._meta.self }
    }

    $reload () {
      return reload(this._meta.self)
    }

    $loadItems () {
      return this._meta.load
    }

    $post (data) {
      return post(this._meta.self, data)
    }

    $patch (data) {
      return patch(this._meta.self, data)
    }

    $del () {
      return del(this._meta.self)
    }
  }

  /**
   * Imitates a full standalone collection with an items property, even if there is no separate URI (as it
   * is the case with embedded collections).
   * Reloading an embedded collection requires special information. Since the embedded collection has no own
   * URI, we need to reload the whole entity containing the embedded collection. Some extra info about the
   * containing entity must therefore be passed to this function.
   * @param items          array of items, which can be mixed primitive values and entity references
   * @param reloadUri      URI of the entity containing the embedded collection (for reloading)
   * @param reloadProperty property in the containing entity under which the embedded collection is saved
   * @param loadPromise    a promise that will resolve when the parent entity has finished (re-)loading
   */
  class EmbeddedCollection extends CanHaveItems {
    constructor (items, reloadUri, reloadProperty, loadPromise = null) {
      super()
      this._meta = {
        load: loadPromise
          ? loadPromise.then(loadedParent => new EmbeddedCollection(loadedParent[reloadProperty], reloadUri, reloadProperty))
          : Promise.resolve(this),
        reload: { uri: reloadUri, property: reloadProperty }
      }
      this.addItemsGetter(items, reloadUri, reloadProperty)
    }

    $loadItems () {
      return new Promise((resolve) => {
        const items = this.items
        if (items instanceof LoadingStoreCollection) items._meta.load.then(result => resolve(result))
        else resolve(items)
      })
    }
  }

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
   * @param uri          optional URI of the entity being loaded, if available. If passed, the
   *                     returned LoadingStoreValue will return it in calls to .self and ._meta.self
   */
  class LoadingStoreValue {
    constructor (entityLoaded, uri = null) {
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
            return uri !== null ? apiRoot + uri : uri
          }
          if (prop === '_meta') {
            // When _meta is requested on a LoadingStoreValue, we keep on using the unmodified promise, because
            // ._meta.load is supposed to resolve to the whole object, not just the ._meta part of it
            return new LoadingStoreValue(entityLoaded, uri)
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

  /**
   * Returns a placeholder for an array that has not yet finished loading from the API. The array placeholder
   * will respond to functional calls (like .find(), .map(), etc.) with further LoadingStoreCollections or
   * LoadingStoreValues. If passed the existingContent argument, random access and .length will also work.
   * @param arrayLoaded     Promise that resolves once the array has finished loading
   * @param existingContent optionally set the elements that are already known, for random access
   */
  class LoadingStoreCollection {
    constructor (arrayLoaded, existingContent = []) {
      const singleResultFunctions = ['find']
      const arrayResultFunctions = ['map', 'flatMap', 'filter']
      this._meta = { load: arrayLoaded }
      singleResultFunctions.forEach(func => {
        existingContent[func] = (...args) => {
          const resultLoaded = arrayLoaded.then(array => array[func](...args))
          return new LoadingStoreValue(resultLoaded)
        }
      })
      arrayResultFunctions.forEach(func => {
        existingContent[func] = (...args) => {
          const resultLoaded = arrayLoaded.then(array => array[func](...args))
          return new LoadingStoreCollection(resultLoaded)
        }
      })
      return existingContent
    }
  }

  return { wrap, StoreValue, LoadingStoreValue }
}
