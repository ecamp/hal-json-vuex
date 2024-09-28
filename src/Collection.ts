import type ResourceInterface from './interfaces/ResourceInterface'
import type CollectionInterface from './interfaces/CollectionInterface'
import type { Link, StoreDataCollection } from '@/interfaces/StoreData'

import { isEntityReference } from './halHelpers'
import LoadingCollection from './LoadingCollection'
import Resource from './Resource'

/**
  * Filter out items that are marked as deleting (eager removal)
  */
function filterDeleting<T extends ResourceInterface> (array: Array<T>): Array<T> {
  return array.filter(entry => !entry._meta.deleting)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class Collection<ItemType extends ResourceInterface, ResourceType extends CollectionInterface<ItemType, ResourceType> = any> extends Resource<ResourceType, StoreDataCollection<ResourceType>> implements CollectionInterface<ItemType, ResourceType> {
  /**
     * Get items excluding ones marked as 'deleting' (eager remove)
     * The items property should always be a getter, in order to make the call to mapArrayOfEntityReferences
     * lazy, since that potentially fetches a large number of entities from the API.
     */
  public get items (): Array<ItemType> {
    return filterDeleting<ItemType>(this._mapArrayOfEntityReferences(this._storeData.items))
  }

  /**
     * Get all items including ones marked as 'deleting' (lazy remove)
     */
  public get allItems (): Array<ItemType> {
    return this._mapArrayOfEntityReferences(this._storeData.items)
  }

  /**
     * Returns a promise that resolves to the collection object, once all items have been loaded
     */
  public $loadItems (): Promise<this> {
    return this._itemLoader(this._storeData.items)
  }

  /**
     *  Returns a promise that resolves to the collection object, once all items have been loaded
     */
  private _itemLoader (array: Array<ItemType | Link>) : Promise<this> {
    if (!this._containsUnknownEntityReference(array)) {
      return Promise.resolve(this)
    }

    // eager loading of 'fetchAllUri' (e.g. parent for embedded collections)
    if (this.config.avoidNPlusOneRequests) {
      return this.apiActions.reload<this>(this)

      // no eager loading: replace each reference (Link) with a Resource (ResourceInterface)
    } else {
      const arrayWithReplacedReferences = this._replaceEntityReferences(array)

      return Promise.all(
        arrayWithReplacedReferences.map(entry => entry._meta.load)
      ).then(() => this)
    }
  }

  /**
     * Given an array, replaces any entity references in the array with the entity loaded from the Vuex store
     * (or from the API if necessary), and returns that as a new array. In case some of the entity references in
     * the array have not finished loading yet, returns a LoadingCollection instead.
     * @param array            possibly mixed array of values and references
     * @returns array          the new array with replaced items, or a LoadingCollection if any of the array
     *                         elements is still loading.
     */
  private _mapArrayOfEntityReferences (array: Array<Link>): Array<ItemType> {
    if (!this._containsUnknownEntityReference(array)) {
      return this._replaceEntityReferences(array)
    }

    const itemsLoaded = this._itemLoader(array).then(() => this._replaceEntityReferences(array))

    // eager loading of 'fetchAllUri' (e.g. parent for embedded collections)
    if (this.config.avoidNPlusOneRequests) {
      return LoadingCollection.create<ItemType>(itemsLoaded)

      // no eager loading: replace each reference (Link) with a Resource (ResourceInterface)
    } else {
      return LoadingCollection.create<ItemType>(itemsLoaded, this._replaceEntityReferences(array))
    }
  }

  /**
   * Replace each item in array with a proper Resource (or LoadingResource)
   */
  private _replaceEntityReferences (array: Array<ItemType | Link>): Array<ItemType> {
    const links = array.filter(isEntityReference)
    return links.map(entry => this.apiActions.get<ItemType>(entry.href) as ItemType)
  }

  /**
   * Returns true if any of the items within 'array' is not yet known to the API (meaning it has never been loaded)
   */
  private _containsUnknownEntityReference (array: Array<ItemType | Link>): array is Array<Link> {
    return array.some(entry => isEntityReference(entry) && this.apiActions.isUnknown(entry.href))
  }
}

export default Collection
