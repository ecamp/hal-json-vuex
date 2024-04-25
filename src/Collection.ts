import { isEntityReference } from './halHelpers'
import LoadingCollection from './LoadingCollection'
import ResourceInterface from './interfaces/ResourceInterface'
import CollectionInterface from './interfaces/CollectionInterface'
import { Link, StoreDataCollection } from './interfaces/StoreData'
import Resource from './Resource'

/**
  * Filter out items that are marked as deleting (eager removal)
  */
function filterDeleting (array: Array<ResourceInterface>): Array<ResourceInterface> {
  return array.filter(entry => !entry._meta.deleting)
}

class Collection extends Resource<StoreDataCollection> {
  /**
     * Get items excluding ones marked as 'deleting' (eager remove)
     * The items property should always be a getter, in order to make the call to mapArrayOfEntityReferences
     * lazy, since that potentially fetches a large number of entities from the API.
     */
  public get items (): Array<ResourceInterface> {
    return filterDeleting(this._mapArrayOfEntityReferences(this._storeData.items))
  }

  /**
     * Get all items including ones marked as 'deleting' (lazy remove)
     */
  public get allItems (): Array<ResourceInterface> {
    return this._mapArrayOfEntityReferences(this._storeData.items)
  }

  /**
     * Returns a promise that resolves to the collection object, once all items have been loaded
     */
  public $loadItems () :Promise<CollectionInterface> {
    return this._itemLoader(this._storeData.items)
  }

  /**
     *  Returns a promise that resolves to the collection object, once all items have been loaded
     */
  private _itemLoader (array: Array<Link>) : Promise<CollectionInterface> {
    if (!this._containsUnknownEntityReference(array)) {
      return Promise.resolve(this as unknown as CollectionInterface) // we know that this object must be of type CollectionInterface
    }

    // eager loading of 'fetchAllUri' (e.g. parent for embedded collections)
    if (this.config.avoidNPlusOneRequests) {
      return this.apiActions.reload(this as unknown as CollectionInterface) as Promise<CollectionInterface> // we know that reload resolves to a type CollectionInterface

      // no eager loading: replace each reference (Link) with a Resource (ResourceInterface)
    } else {
      const arrayWithReplacedReferences = this._replaceEntityReferences(array)

      return Promise.all(
        arrayWithReplacedReferences.map(entry => entry._meta.load)
      ).then(() => this as unknown as CollectionInterface) // we know that this object must be of type CollectionInterface
    }
  }

  /**
     * Given an array, replaces any entity references in the array with the entity loaded from the Vuex store
     * (or from the API if necessary), and returns that as a new array. In case some of the entity references in
     * the array have not finished loading yet, returns a LoadingCollection instead.
     * @param array            possibly mixed array of values and references
     * @param fetchAllUri      URI that allows fetching all array items in a single network request, if known
     * @param fetchAllProperty property in the entity from fetchAllUri that will contain the array
     * @returns array          the new array with replaced items, or a LoadingCollection if any of the array
     *                         elements is still loading.
     */
  private _mapArrayOfEntityReferences (array: Array<Link>): Array<ResourceInterface> {
    if (!this._containsUnknownEntityReference(array)) {
      return this._replaceEntityReferences(array)
    }

    const itemsLoaded = this._itemLoader(array).then(() => this._replaceEntityReferences(array))

    // eager loading of 'fetchAllUri' (e.g. parent for embedded collections)
    if (this.config.avoidNPlusOneRequests) {
      return LoadingCollection.create(itemsLoaded)

      // no eager loading: replace each reference (Link) with a Resource (ResourceInterface)
    } else {
      return LoadingCollection.create(itemsLoaded, this._replaceEntityReferences(array))
    }
  }

  /**
   * Replace each item in array with a proper Resource (or LoadingResource)
   */
  private _replaceEntityReferences (array: Array<Link>): Array<ResourceInterface> {
    return array
      .filter(entry => isEntityReference(entry))
      .map(entry => this.apiActions.get(entry.href))
  }

  /**
   * Returns true if any of the items within 'array' is not yet known to the API (meaning it has never been loaded)
   */
  private _containsUnknownEntityReference (array: Array<Link>): boolean {
    return array.some(entry => isEntityReference(entry) && this.apiActions.isUnknown(entry.href))
  }
}

export default Collection
