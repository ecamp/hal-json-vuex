/**
 * This function allow you to modify a JS Promise by adding some status properties.
 * Based on: http://stackoverflow.com/questions/21485545/is-there-a-way-to-tell-if-an-es6-promise-is-fulfilled-rejected-resolved
 * But modified according to the specs of promises : https://promisesaplus.com/
 */
class QueryablePromise<T> {
  private originalPromise: Promise<T>

  constructor (promise: Promise<T>) {
    // Don't modify any promise that has been already modified
    // if (Symbol.for('isPending') in promise) return promise

    this.originalPromise = promise

    // Set initial state
    let isPending = true
    let isRejected = false
    let isFulfilled = false

    // Observe the promise, saving the fulfillment in a closure scope.
    const queryablePromise = promise.then(
      function (v) {
        isFulfilled = true
        isPending = false
        return v
      },
      function (e) {
        isRejected = true
        isPending = false
        throw e
      }
    )

    Object.defineProperty(queryablePromise, 'originalPromise', promise)

    Object.defineProperty(queryablePromise, Symbol.for('isFulfilled'), { get: function () { return isFulfilled } })
    Object.defineProperty(queryablePromise, Symbol.for('isPending'), { get: function () { return isPending } })
    Object.defineProperty(queryablePromise, Symbol.for('isRejected'), { get: function () { return isRejected } })
    Object.defineProperty(queryablePromise, Symbol.for('done'), { get: function () { return !isPending } }) // official terminology would be 'isSettled' or 'isResolved' (https://stackoverflow.com/questions/29268569/what-is-the-correct-terminology-for-javascript-promises)

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return queryablePromise
  }

  then<TResult1, TResult2> (onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined): QueryablePromise<TResult1 | TResult2> {
    return new QueryablePromise(this.originalPromise.then(onfulfilled, onrejected))
  }

  catch<TResult = never> (onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null | undefined) : QueryablePromise<T | TResult> {
    return new QueryablePromise(this.originalPromise.catch(onrejected))
  }

  /**
   * Returns a resolved Promise and immediately mark it as 'done'
   */
  static resolve<T> (value: T): QueryablePromise<T> {
    let promiseResolve: (value: T) => void

    // create a new QueryablePromise...
    const promise = new QueryablePromise(new Promise(function (resolve) {
      promiseResolve = resolve
    }) as Promise<T>)

    // .. and resolve it immediately (although Typescript is not very happy with this: https://github.com/microsoft/TypeScript/issues/36968)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    promiseResolve(value)

    return promise
  }
}

export default QueryablePromise
