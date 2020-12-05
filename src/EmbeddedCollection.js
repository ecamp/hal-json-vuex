import CanHaveItems from './CanHaveItems.js'
import LoadingStoreCollection from './LoadingStoreCollection'

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
  constructor (items, reloadUri, reloadProperty, { get, reload, isUnknown }, config, loadPromise = null) {
    super({ get, reload, isUnknown }, config)
    this._meta = {
      load: loadPromise
        ? loadPromise.then(loadedParent => new EmbeddedCollection(loadedParent[reloadProperty], reloadUri, reloadProperty, { get, reload, isUnknown }, config))
        : Promise.resolve(this),
      reload: { uri: reloadUri, property: reloadProperty }
    }
    this.addItemsGetter(items, reloadUri, reloadProperty)
  }

  $loadItems () {
    return new Promise((resolve) => {
      const items = this.items
      // TODO: this is probably broken as LoadingStoreCollection has no constructor anymore
      if (items instanceof LoadingStoreCollection) items._meta.load.then(result => resolve(result))
      else resolve(items)
    })
  }
}

export default EmbeddedCollection
