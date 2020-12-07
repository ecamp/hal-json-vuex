import { isEntityReference } from './halHelpers'
import LoadingStoreCollection from './LoadingStoreCollection'
import Resource from './interfaces/Resource'
import ApiActions from './interfaces/ApiActions'
import { InternalConfig } from './interfaces/Config'
import { Link } from './interfaces/StoreData'

interface Collection {
  items: Array<Resource>
  allItems: Array<Resource>
}

class CanHaveItems implements Collection {
  apiActions: ApiActions
  config: InternalConfig

  private storeItems: Array<Link>
  private fetchAllUri: string
  private fetchAllProperty: string

  /**
   * @param apiActions        dependency injection of API actions
   * @param config            dependency injection of config object
   * @param storeItems        array of items, which can be mixed primitive values and entity references
   * @param fetchAllUri       URI that allows fetching all collection items in a single network request, if known
   * @param fetchAllProperty  property name inside the entity fetched at fetchAllUri that contains the collection
   */
  constructor (apiActions: ApiActions, config: InternalConfig, storeItems: Array<Link>, fetchAllUri: string, fetchAllProperty: string) {
    this.apiActions = apiActions
    this.config = config
    this.storeItems = storeItems
    this.fetchAllUri = fetchAllUri
    this.fetchAllProperty = fetchAllProperty
  }

  /**
   * Get items excluding ones marked as 'deleting' (eager remove)
   * The items property should always be a getter, in order to make the call to mapArrayOfEntityReferences
   * lazy, since that potentially fetches a large number of entities from the API.
   */
  public get items (): Array<Resource> {
    return this.filterDeleting(this.mapArrayOfEntityReferences(this.storeItems, this.fetchAllUri, this.fetchAllProperty))
  }

  /**
   * Get all items including ones marked as 'deleting' (lazy remove)
   */
  public get allItems (): Array<Resource> {
    return this.mapArrayOfEntityReferences(this.storeItems, this.fetchAllUri, this.fetchAllProperty)
  }

  /**
   * Filter out items that are mareked as deleting (eager removal)
   */
  private filterDeleting (array: Array<Resource>): Array<Resource> {
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
  private mapArrayOfEntityReferences (array: Array<Link>, fetchAllUri: string, fetchAllProperty: string): Array<Resource> {
    if (!this.containsUnknownEntityReference(array)) {
      return this.replaceEntityReferences(array)
    }

    // eager loading of 'fetchAllUri' (e.g. parent for embedded collections)
    if (this.config.avoidNPlusOneRequests) {
      const completelyLoaded = this.apiActions.reload({ _meta: { reload: { uri: fetchAllUri, property: fetchAllProperty } } })
        .then(() => this.replaceEntityReferences(array))
      return LoadingStoreCollection.create(completelyLoaded)

    // no eager loading: replace each reference (Link) with a StoreValue (Resource)
    } else {
      const arrayWithReplacedReferences = this.replaceEntityReferences(array)

      // TODO: why is the next step needed? Is it not sufficient to only return arrayWithReplacedReferences?
      const arrayCompletelyLoaded = Promise.all(array.map(entry => {
        if (isEntityReference(entry)) {
          return this.apiActions.get(entry.href)._meta.load // also TODO: we generate a StoreValue for each entry again, which was already done above with replaceEntityReferences
        }
        return Promise.resolve(entry)
      }))
      return LoadingStoreCollection.create(arrayCompletelyLoaded, arrayWithReplacedReferences)
    }
  }

  /**
   * Replace each item in array with a proper StoreValue (or LoadingStoreValue)
   */
  private replaceEntityReferences (array: Array<Link>): Array<Resource> {
    return array.map(entry => {
      if (isEntityReference(entry)) {
        return this.apiActions.get(entry.href)
      }
      return entry as Resource // TODO: in which case would this happen? shouldn't 'items' always contain entity references
    })
  }

  /**
   * Returns true if any of the items within 'array' is not yet known to the API (=has never been loaded)
   */
  private containsUnknownEntityReference (array: Array<Link>): boolean {
    return array.some(entry => isEntityReference(entry) && this.apiActions.isUnknown(entry.href))
  }
}

export default CanHaveItems
