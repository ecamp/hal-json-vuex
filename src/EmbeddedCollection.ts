import { EmbeddedCollectionMeta } from './interfaces/EmbeddedCollection'
import { Link } from './interfaces/StoreData'
import Collection from './interfaces/Collection'

/**
 * Imitates a full standalone collection with an items property, even if there is no separate URI (as it
 * is the case with embedded collections).
 * Reloading an embedded collection requires special information. Since the embedded collection has no own
 * URI, we need to reload the whole entity containing the embedded collection. Some extra info about the
 * containing entity must therefore be passed to the constrcutor.
 */
class EmbeddedCollection implements EmbeddedCollectionMeta {
  public _meta: {
    load: Promise<EmbeddedCollectionMeta>,
    reload: {
      uri: string,
      property: string
    }
  }

  _storeData: {
    items: Array<Link>
  }

  /**
   * @param items           array of items, which can be mixed primitive values and entity references
   * @param reloadUri       URI of the entity containing the embedded collection (for reloading)
   * @param reloadProperty  property in the containing entity under which the embedded collection is saved
   * @param loadCollection  a promise that will resolve when the parent entity has finished (re-)loading
   */
  constructor (collection: Collection, reloadUri: string, reloadProperty: string, loadCollection: Promise<EmbeddedCollectionMeta> | null = null) {
    this._storeData = {
      items: collection._storeData.items
    }

    this._meta = {
      load: loadCollection || Promise.resolve(this),
      reload: {
        uri: reloadUri,
        property: reloadProperty
      }
    }
  }
}

export default EmbeddedCollection
