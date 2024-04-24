import { Link, VirtualLink, TemplatedLink } from './interfaces/StoreData'
import { ResourceInterface, VirtualResource } from './interfaces/ResourceInterface'
import Collection from '@/Collection'
import CollectionInterface from "@/interfaces/CollectionInterface";

export type keyValueObject = Record<string, unknown>

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
function isEntityReference (object: unknown): object is Link {
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
function isVirtualResource (resource: unknown): resource is VirtualResource {
  return (resource as VirtualResource)._storeData?._meta?.virtual
}

/**
 * A standalone collection in the Vuex store has an items property that is an array.
 * @param object    to be examined
 * @returns boolean true if the object looks like a standalone collection, false otherwise
 */
function isCollection<Item extends ResourceInterface> (object: unknown): object is CollectionInterface<Item> {
  return !!(object && Array.isArray((object as CollectionInterface<Item>).items))
}

export { isTemplatedLink, isVirtualLink, isEntityReference, isCollection, isVirtualResource }
