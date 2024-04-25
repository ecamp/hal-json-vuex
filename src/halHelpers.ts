import { Link, VirtualLink, TemplatedLink, StoreDataCollection } from './interfaces/StoreData'
import { ResourceInterface, VirtualResource } from './interfaces/ResourceInterface'

type keyValueObject = Record<string, unknown>

/**
 * Verifies that two arrays contain the same values while ignoring the order
 */
function isEqualIgnoringOrder<T> (array: Array<T>, other: Array<T>) :boolean {
  return array.length === other.length && array.every(elem => other.includes(elem))
}

/**
 * A templated link in the Vuex store looks like this: { href: '/some/uri{/something}', templated: true }
 * @param object         to be examined
 * @returns boolean      true if the object looks like a templated link, false otherwise
 */
function isTemplatedLink (object: keyValueObject): object is TemplatedLink {
  if (!object) return false
  return isEqualIgnoringOrder(Object.keys(object), ['href', 'templated']) && (object.templated === true)
}

/**
 * An entity reference in the Vuex store looks like this: { href: '/some/uri' }
 * Serves as a type guard for interface EntityReference
 * @param object    to be examined
 * @returns boolean true if the object looks like an entity reference, false otherwise
 */
function isEntityReference (object: keyValueObject): object is Link {
  if (!object) return false
  return isEqualIgnoringOrder(Object.keys(object), ['href'])
}

/**
 * A virtual link in the Vuex store looks like this: { href: '/some/uri{/something}', virtual: true }
 * @param object         to be examined
 * @returns boolean      true if the object looks like a templated link, false otherwise
 */
function isVirtualLink (object: keyValueObject): object is VirtualLink {
  if (!object) return false
  return isEqualIgnoringOrder(Object.keys(object), ['href', 'virtual']) && (object.virtual === true)
}

/**
 * A virtual resource contains a generated, virtual self link which points to another store key but
 * doesn't correspond to an actual resource on the API. Such resources have the _meta.virtual flag set to true.
 * @param resource
 * @returns boolean  true if resource is a VirtualResource
 */
function isVirtualResource<StoreType> (resource: ResourceInterface<StoreType>): resource is VirtualResource<StoreType> {
  return (resource as VirtualResource<StoreType>)._storeData?._meta?.virtual as boolean
}

/**
 * A standalone collection in the Vuex store has an items property that is an array.
 * @param object    to be examined
 * @returns boolean true if the object looks like a standalone collection, false otherwise
 */
function isCollection<StoreType> (object: keyValueObject): object is StoreDataCollection<StoreType> {
  return !!(object && Array.isArray(object.items))
}

export { isTemplatedLink, isVirtualLink, isEntityReference, isCollection, isVirtualResource }
