import { Link, TemplatedLink, Collection } from './interfaces/StoreData'

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
 * A standalone collection in the Vuex store has an items property that is an array.
 * @param object    to be examined
 * @returns boolean true if the object looks like a standalone collection, false otherwise
 */
function isCollection (object: keyValueObject): object is Collection {
  return !!(object && Array.isArray(object.items))
}

export { isTemplatedLink, isEntityReference, isCollection }
