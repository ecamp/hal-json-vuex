/**
 * Verifies that two arrays contain the same values while ignoring the order
 */
function isEqualIgnoringOrder (array, other) {
  return array.length === other.length && array.every(elem => other.includes(elem))
}

/**
 * A templated link in the Vuex store looks like this: { href: '/some/uri{/something}', templated: true }
 * @param object         to be examined
 * @returns boolean      true if the object looks like a templated link, false otherwise
 */
function isTemplatedLink (object) {
  if (!object) return false
  return isEqualIgnoringOrder(Object.keys(object), ['href', 'templated']) && (object.templated === true)
}

/**
 * An entity reference in the Vuex store looks like this: { href: '/some/uri' }
 * @param object    to be examined
 * @returns boolean true if the object looks like an entity reference, false otherwise
 */
function isEntityReference (object) {
  if (!object) return false
  return isEqualIgnoringOrder(Object.keys(object), ['href'])
}

/**
 * A standalone collection in the Vuex store has an items property that is an array.
 * @param object    to be examined
 * @returns boolean true if the object looks like a standalone collection, false otherwise
 */
function isCollection (object) {
  return !!(object && Array.isArray(object.items))
}

export { isTemplatedLink, isEntityReference, isCollection }
