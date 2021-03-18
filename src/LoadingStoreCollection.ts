import LoadingStoreValue from './LoadingStoreValue'
import Resource from './interfaces/Resource'

class LoadingStoreCollection {
  /**
   * Returns a placeholder for an array that has not yet finished loading from the API. The array placeholder
   * will respond to functional calls (like .find(), .map(), etc.) with further LoadingStoreCollections or
   * LoadingStoreValues. If passed the existingContent argument, random access and .length will also work.
   * @param loadArray       Promise that resolves once the array has finished loading
   * @param existingContent optionally set the elements that are already known, for random access
   */
  static create (loadArray: Promise<Array<Resource> | undefined>, existingContent: Array<Resource> = []): Array<Resource> {
    // if Promsise resolves to undefined, provide empty array
    // this could happen if items is accessed from a LoadingStoreValue, which resolves to a normal entity without 'items'
    const loadArraySafely = loadArray.then(array => array ?? [])

    // proxy array function 'find' to a LadingStoreValue (Resource)
    const singleResultFunctions = ['find']
    singleResultFunctions.forEach(func => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      existingContent[func] = (...args: any[]) => {
        const resultLoaded = loadArraySafely.then(array => array[func](...args) as Resource)
        return new LoadingStoreValue(resultLoaded)
      }
    })

    // proxy array functions with multiple results to a LadingStoreCollection (Array<Resource>)
    const arrayResultFunctions = ['map', 'flatMap', 'filter']
    arrayResultFunctions.forEach(func => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      existingContent[func] = (...args: any[]) => {
        const resultLoaded = loadArraySafely.then(array => array[func](...args) as Array<Resource>)
        return LoadingStoreCollection.create(resultLoaded)
      }
    })
    return existingContent
  }
}

export default LoadingStoreCollection
