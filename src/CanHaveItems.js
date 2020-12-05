import { isEntityReference } from './halHelpers.js'
import LoadingStoreCollection from './LoadingStoreCollection'

class CanHaveItems {
  constructor ({ get, reload, isUnknown }, config) {
    this.apiActions = { get, reload, isUnknown }
    this.config = config
  }

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

    if (this.config.avoidNPlusOneRequests) {
      const completelyLoaded = this.apiActions.reload({ _meta: { reload: { uri: fetchAllUri, property: fetchAllProperty } } }, true)
        .then(() => this.replaceEntityReferences(array))
      return LoadingStoreCollection.create(completelyLoaded)
    } else {
      const arrayWithReplacedReferences = this.replaceEntityReferences(array)
      const arrayCompletelyLoaded = Promise.all(array.map(entry => {
        if (isEntityReference(entry)) {
          return this.apiActions.get(entry.href)._meta.load
        }
        return Promise.resolve(entry)
      }))
      return LoadingStoreCollection.create(arrayCompletelyLoaded, arrayWithReplacedReferences)
    }
  }

  replaceEntityReferences (array) {
    return array.map(entry => {
      if (isEntityReference(entry)) {
        return this.apiActions.get(entry.href)
      }
      return entry
    })
  }

  containsUnknownEntityReference (array) {
    return array.some(entry => isEntityReference(entry) && this.apiActions.isUnknown(entry.href))
  }
}

export default CanHaveItems
