import { isEntityReference } from './halHelpers'
import LoadingArray from './LoadingArray'
import Resource from './interfaces/Resource'
import {Link, StoreData} from './interfaces/StoreData'
import StoreValue from "@/StoreValue";
import ApiActions from "@/interfaces/ApiActions";
import StoreValueCreator from "@/StoreValueCreator";
import {InternalConfig} from "@/interfaces/Config";

class Collection extends StoreValue {
  protected fetchAllUri = ''
  protected fetchAllProperty = ''
  protected _items : Array<Link>

  /**
   * Filter out items that are marked as deleting (eager removal)
   */
  protected filterDeleting (array: Array<Resource> | LoadingArray<Resource>): Array<Resource> | LoadingArray<Resource> {
    return array.filter(entry => !entry._meta.deleting)
  }

  /**
   * Given an array, replaces any entity references in the array with the entity loaded from the Vuex store
   * (or from the API if necessary), and returns that as a new array. In case some of the entity references in
   * the array have not finished loading yet, returns a LoadingArray instead.
   * @param array            possibly mixed array of values and references
   * @param fetchAllUri      URI that allows fetching all array items in a single network request, if known
   * @param fetchAllProperty property in the entity from fetchAllUri that will contain the array
   * @returns array          the new array with replaced items, or a LoadingArray if any of the array
   *                         elements is still loading.
   */
  protected mapArrayOfEntityReferences (array: Array<Link>, fetchAllUri: string, fetchAllProperty: string): Array<Resource> | LoadingArray<Resource> {
    if (!this.containsUnknownEntityReference(array)) {
      return this.replaceEntityReferences(array)
    }

    // eager loading of 'fetchAllUri' (e.g. parent for embedded collections)
    if (this.config.avoidNPlusOneRequests) {
      const completelyLoaded = this.apiActions.reload({ _meta: { reload: { uri: fetchAllUri, property: fetchAllProperty } } })
          .then(() => this.replaceEntityReferences(array))
      return new LoadingArray(completelyLoaded)

      // no eager loading: replace each reference (Link) with a StoreValue (Resource)
    } else {
      const arrayWithReplacedReferences = this.replaceEntityReferences(array)

      const arrayCompletelyLoaded = Promise.all(
          arrayWithReplacedReferences.map(entry => entry._meta.load)
      )

      return new LoadingArray(arrayCompletelyLoaded, arrayWithReplacedReferences)
    }
  }

  /**
   * Replace each item in array with a proper Resource (or LoadingValue)
   */
  protected replaceEntityReferences (array: Array<Link>): Array<Resource> {
    return array
        .filter(entry => isEntityReference(entry))
        .map(entry => this.apiActions.get(entry.href))
  }

  /**
   * Returns true if any of the items within 'array' is not yet known to the API (meaning it has never been loaded)
   */
  protected containsUnknownEntityReference (array: Array<Link>): boolean {
    return array.some(entry => isEntityReference(entry) && this.apiActions.isUnknown(entry.href))
  }

  /**
   * Get items excluding ones marked as 'deleting' (eager remove)
   * The items property should always be a getter, in order to make the call to mapArrayOfEntityReferences
   * lazy, since that potentially fetches a large number of entities from the API.
   */
  public get items(): Array<Resource> | LoadingArray<Resource> {
    return this.filterDeleting(this.mapArrayOfEntityReferences(this._items, this.fetchAllUri, this.fetchAllProperty))
  }

  /**
   * Get all items including ones marked as 'deleting' (lazy remove)
   */
  public get allItems(): Array<Resource> | LoadingArray<Resource> {
    return this.mapArrayOfEntityReferences(this._items, this.fetchAllUri, this.fetchAllProperty)
  }

  /**
   * @param storeData fully loaded entity storeData from the Vuex store
   * @param apiActions inject dependency: API actions
   * @param storeValueCreator inject dependency StoreValue factory
   * @param config inject dependency: config options
   */
  constructor(storeData: StoreData, apiActions: ApiActions, storeValueCreator: StoreValueCreator, config: InternalConfig) {
    super(storeData, apiActions, storeValueCreator, config);

    this._items = storeData.items
  }
}

export default Collection
