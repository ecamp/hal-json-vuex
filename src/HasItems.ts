import { isEntityReference } from './halHelpers'
import LoadingStoreCollection from './LoadingStoreCollection'
import Resource from './interfaces/Resource'
import Collection from './interfaces/Collection'
import { Link } from './interfaces/StoreData'
import ApiActions from './interfaces/ApiActions'
import { InternalConfig } from './interfaces/Config'

// Check Typescript Handbook fore more explanation of mixin pattern
// https://www.typescriptlang.org/docs/handbook/mixins.html

// Now we use a generic version which can apply a constraint on
// the class which this mixin is applied to
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GConstructor<T> = new (...args: any[]) => T;

// Ensure property _storeData.items exist
type HasStoreData = GConstructor<{ _storeData: { items: Array<Link> } }>;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function HasItems<TBase extends HasStoreData> (Base: TBase, apiActions: ApiActions, config: InternalConfig, reloadUri?: string, reloadProperty?: string) {
  /**
   * Filter out items that are marked as deleting (eager removal)
   */
  function filterDeleting (array: Array<Resource>): Array<Resource> {
    return array.filter(entry => !entry._meta.deleting)
  }

  /**
   * Replace each item in array with a proper StoreValue (or LoadingStoreValue)
   */
  function replaceEntityReferences (array: Array<Link>): Array<Resource> {
    return array
      .filter(entry => isEntityReference(entry))
      .map(entry => apiActions.get(entry.href))
  }

  /**
   * Returns true if any of the items within 'array' is not yet known to the API (meaning it has never been loaded)
   */
  function containsUnknownEntityReference (array: Array<Link>): boolean {
    return array.some(entry => isEntityReference(entry) && apiActions.isUnknown(entry.href))
  }

  const HasItems = class extends Base {
    /**
     * Get items excluding ones marked as 'deleting' (eager remove)
     * The items property should always be a getter, in order to make the call to mapArrayOfEntityReferences
     * lazy, since that potentially fetches a large number of entities from the API.
     */
    public get items (): Array<Resource> {
      return filterDeleting(this._mapArrayOfEntityReferences(this._storeData.items))
    }

    /**
     * Get all items including ones marked as 'deleting' (lazy remove)
     */
    public get allItems (): Array<Resource> {
      return this._mapArrayOfEntityReferences(this._storeData.items)
    }

    /**
     * Returns a promise that resolves to the collection object, once all items have been loaded
     */
    public $loadItems () :Promise<Collection> {
      return this._itemLoader(this._storeData.items)
    }

    /**
     *  Returns a promise that resolves to the collection object, once all items have been loaded
     */
    _itemLoader (array: Array<Link>) : Promise<Collection> {
      if (!containsUnknownEntityReference(array)) {
        return Promise.resolve(this as unknown as Collection) // we know that this object must be of type Collection
      }

      // eager loading of 'fetchAllUri' (e.g. parent for embedded collections)
      if (config.avoidNPlusOneRequests && reloadUri) {
        return apiActions.reload({ _meta: { reload: { uri: reloadUri || '', property: reloadProperty || '' } } }) as Promise<Collection> // we know that reload resolves to a type Collection

      // no eager loading: replace each reference (Link) with a StoreValue (Resource)
      } else {
        const arrayWithReplacedReferences = replaceEntityReferences(array)

        return Promise.all(
          arrayWithReplacedReferences.map(entry => entry._meta.load)
        ).then(() => this as unknown as Collection) // we know that this object must be of type Collection
      }
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
    _mapArrayOfEntityReferences (array: Array<Link>): Array<Resource> {
      if (!containsUnknownEntityReference(array)) {
        return replaceEntityReferences(array)
      }

      const itemsLoaded = this._itemLoader(array).then(() => replaceEntityReferences(array))

      // eager loading of 'fetchAllUri' (e.g. parent for embedded collections)
      if (config.avoidNPlusOneRequests) {
        return LoadingStoreCollection.create(itemsLoaded)

      // no eager loading: replace each reference (Link) with a StoreValue (Resource)
      } else {
        return LoadingStoreCollection.create(itemsLoaded, replaceEntityReferences(array))
      }
    }
  }

  return HasItems
}

export default HasItems
