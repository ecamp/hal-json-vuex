import LoadingStoreValue from './LoadingStoreValue'

/**
 * Returns a placeholder for an array that has not yet finished loading from the API. The array placeholder
 * will respond to functional calls (like .find(), .map(), etc.) with further LoadingStoreCollections or
 * LoadingStoreValues. If passed the existingContent argument, random access and .length will also work.
 * @param arrayLoaded     Promise that resolves once the array has finished loading
 * @param existingContent optionally set the elements that are already known, for random access
 */
class LoadingStoreCollection {
  constructor (arrayLoaded, existingContent = []) {
    const singleResultFunctions = ['find']
    const arrayResultFunctions = ['map', 'flatMap', 'filter']
    this._meta = { load: arrayLoaded }
    singleResultFunctions.forEach(func => {
      existingContent[func] = (...args) => {
        const resultLoaded = arrayLoaded.then(array => array[func](...args))
        return new LoadingStoreValue(resultLoaded)
      }
    })
    arrayResultFunctions.forEach(func => {
      existingContent[func] = (...args) => {
        const resultLoaded = arrayLoaded.then(array => array[func](...args))
        return new LoadingStoreCollection(resultLoaded)
      }
    })
    return existingContent
  }
}

export default LoadingStoreCollection
