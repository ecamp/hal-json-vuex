import urltemplate from 'url-template'
import { isTemplatedLink, isEntityReference, isCollection } from './halHelpers.js'
import QueryablePromise from './QueryablePromise.js'
import EmbeddedCollection from './EmbeddedCollection.js'
import CanHaveItems from './CanHaveItems.js'

/**
 * Creates an actual StoreValue, by wrapping the given Vuex store data. The data must not be loading.
 * If the data has been loaded into the store before but is currently reloading, the old data will be
 * returned, along with a ._meta.load promise that resolves when the reload is complete.
 * @param data fully loaded entity data from the Vuex store
 */
class StoreValue extends CanHaveItems {
  constructor (data, { get, reload, post, patch, del, isUnknown }, StoreValueCreator, config) {
    super({ get, reload, isUnknown }, config)

    this.apiActions = { get, reload, post, patch, del, isUnknown }
    this.config = config

    Object.keys(data).forEach(key => {
      const value = data[key]
      if (key === 'allItems' && isCollection(data)) return
      if (key === 'items' && isCollection(data)) {
        this.addItemsGetter(data[key], data._meta.self, key)
      } else if (Array.isArray(value) && value.length > 0 && isEntityReference(value[0])) { // need min. 1 item to detect an embedded collection
        this[key] = () => new EmbeddedCollection(value, data._meta.self, key, { get, reload, isUnknown }, config, data._meta.load)
      } else if (isEntityReference(value)) {
        this[key] = () => this.apiActions.get(value.href)
      } else if (isTemplatedLink(value)) {
        this[key] = templateParams => this.apiActions.get(urltemplate.parse(value.href).expand(templateParams || {}))
      } else {
        this[key] = value
      }
    })

    // Use a trivial load promise to break endless recursion, except if we are currently reloading the data from the API
    const loadedPromise = data._meta.load && !data._meta.load[Symbol.for('done')]
      ? data._meta.load.then(reloadedData => StoreValueCreator.wrap(reloadedData))
      : QueryablePromise.resolve(this)

    // Use a shallow clone of _meta, since we don't want to overwrite the ._meta.load promise or self link in the Vuex store
    this._meta = { ...data._meta, load: loadedPromise, self: this.config.apiRoot + data._meta.self }
  }

  $reload () {
    return this.apiActions.reload(this._meta.self)
  }

  $loadItems () {
    return this._meta.load
  }

  $post (data) {
    return this.apiActions.post(this._meta.self, data)
  }

  $patch (data) {
    return this.apiActions.patch(this._meta.self, data)
  }

  $del () {
    return this.apiActions.del(this._meta.self)
  }
}

export default StoreValue
