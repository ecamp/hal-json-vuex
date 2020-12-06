import CanHaveItems from './CanHaveItems'
// import LoadingStoreCollection from './LoadingStoreCollection'
import Resource, { EmbeddedCollectionType } from './interfaces/Resource'
import ApiActions from './interfaces/ApiActions'
import { InternalConfig } from './interfaces/Config'
import StoreData, { Link } from './interfaces/StoreData'

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
class EmbeddedCollection extends CanHaveItems implements EmbeddedCollectionType {
  // TODO: do we want an interfae for this
  // TODOL do we want to expose the Resource interface here, such that embedded collections have the same public API indepdendent whether a collection is embedded or not
  public _meta: {
    load: Promise<EmbeddedCollectionType>,
    reload: { // TODO: do we want/need to expose this eternally? or sufficient if we keep this in the store and expose $reload()?
      uri: string,
      property: string
    }
  }

  constructor (items: Array<Link>, reloadUri: string, reloadProperty: string, apiActions: ApiActions, config: InternalConfig, loadParent: Promise<StoreData> | null = null) {
    super(apiActions, config)
    this._meta = {
      load: loadParent
        ? loadParent.then(parentResource => new EmbeddedCollection(parentResource[reloadProperty], reloadUri, reloadProperty, apiActions, config))
        : Promise.resolve(this),
      reload: {
        uri: reloadUri,
        property: reloadProperty
      }
    }
    this.addItemsGetter(items, reloadUri, reloadProperty)
  }

  $loadItems () :Promise<Array<Resource>> {
    return new Promise((resolve) => {
      const items = this.items
      // TODO: this is probably broken as LoadingStoreCollection has no constructor anymore
      // if (items instanceof LoadingStoreCollection) items._meta.load.then(result => resolve(result))
      // else resolve(items)
      resolve(items)
    })
  }
}

export default EmbeddedCollection
