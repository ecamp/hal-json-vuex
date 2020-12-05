/**
 * This function allow you to modify a JS Promise by adding some status properties.
 * Based on: http://stackoverflow.com/questions/21485545/is-there-a-way-to-tell-if-an-es6-promise-is-fulfilled-rejected-resolved
 * But modified according to the specs of promises : https://promisesaplus.com/
 */

interface QueryablePromise<T> extends Promise<T> {
  isFulfilled: () => boolean
  isPending: () => boolean
  isRejected: () => boolean

  /*
  // then and catch return QueryablePromise instead of a Promise
  then: <TResult1 = T, TResult2 = never> (onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null) => QueryablePromise<TResult1 | TResult2>
  catch: <TResult = never> (onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null | undefined) => QueryablePromise<T | TResult>
  */
}

/**
 * Wraps a promise to exposes its internal status
 * @param promise
 */
function wrapPromise<T> (promise: Promise<T>): QueryablePromise<T> {
  // Don't wrap any promise that has been already wrapped
  if ('isPending' in promise) return promise

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
  ) as QueryablePromise<T>

  /*
  // override .then to chain original promise and wrap again
  queryablePromise.then = function <TResult1 = T, TResult2 = never> (onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null): QueryablePromise<TResult1 | TResult2> {
    return wrapPromise(promise.then(onfulfilled, onrejected))
  }

  // override .catch to chain original promise and wrap again
  queryablePromise.catch = function <TResult = never> (onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null | undefined) : QueryablePromise<T | TResult> {
    return wrapPromise(promise.catch(onrejected))
  } */

  queryablePromise.isFulfilled = function () { return isFulfilled }
  queryablePromise.isPending = function () { return isPending }
  queryablePromise.isRejected = function () { return isRejected }
  Object.defineProperty(queryablePromise, Symbol.for('done'), { get: function () { return !isPending } }) // official terminology would be 'isSettled' or 'isResolved' (https://stackoverflow.com/questions/29268569/what-is-the-correct-terminology-for-javascript-promises)

  return queryablePromise
}

/**
 * Returns a resolved Promise and immediately mark it as 'done'
 */
function createResolvedPromise<T> (value: T): QueryablePromise<T> {
  let promiseResolve: (value: T) => void

  // create a new QueryablePromise...
  const promise = wrapPromise(new Promise(function (resolve) {
    promiseResolve = resolve
  }) as Promise<T>)

  // .. and resolve it immediately (although Typescript is not very happy with this: https://github.com/microsoft/TypeScript/issues/36968)
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  promiseResolve(value)

  return promise
}

export { QueryablePromise, wrapPromise, createResolvedPromise }
export default QueryablePromise
