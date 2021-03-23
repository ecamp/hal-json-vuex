import LoadingValue from './LoadingValue'

class LoadingArray<T> {
  protected existingContent : Array<T>
  protected load : Promise<Array<T>>

  /**
   * A placeholder for an array that has not yet finished loading from the API. The array placeholder
   * will respond to functional calls (like .find(), .map(), etc.) with further LoadingArrays or
   * LoadingValues. If passed the existingContent argument, random access and .length will also work.
   * @param loadArray       Promise that resolves once the array has finished loading
   * @param existingContent optionally set the elements that are already known, for random access
   */
  constructor(loadArray: Promise<Array<T> | undefined>, existingContent: Array<T> = []) {
    // We're extending Array, re-setting the prototype after super() is necessary as long as we're compiling to ES2015:
    // https://github.com/Microsoft/TypeScript/wiki/FAQ#why-doesnt-extending-built-ins-like-error-array-and-map-work
    Object.setPrototypeOf(this, LoadingArray.prototype)

    // If the Promise resolves to undefined, provide an empty array. This could happen if items
    // is accessed from a LoadingValue, which resolves to a normal object without 'items'
    this.load = loadArray.then(array => array ?? [])
    this.existingContent = existingContent
  }

  find(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): LoadingValue<T> {
    const resultLoaded = this.load.then(array => array.find(predicate, thisArg) as T)
    return new LoadingValue<T>(resultLoaded)
  }

  map<U> (callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any) : LoadingArray<U> {
    const resultLoaded = this.load.then(array => array.map(callbackfn, thisArg) as Array<U>)
    return new LoadingArray<U>(resultLoaded)
  }

  flatMap<U, This = undefined> (callback: (this: This, value: T, index: number, array: T[]) => U | ReadonlyArray<U>, thisArg?: This) : LoadingArray<U> {
    const resultLoaded = this.load.then(array => array.flatMap(callback, thisArg) as Array<U>)
    return new LoadingArray<U>(resultLoaded)
  }

  filter<S extends T> (predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): LoadingArray<T> {
    const resultLoaded = this.load.then(array => array.filter(predicate, thisArg) as Array<T>)
    return new LoadingArray<T>(resultLoaded)
  }
}

export default LoadingArray
