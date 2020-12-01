/**
 * This function allow you to modify a JS Promise by adding some status properties.
 * Based on: http://stackoverflow.com/questions/21485545/is-there-a-way-to-tell-if-an-es6-promise-is-fulfilled-rejected-resolved
 * But modified according to the specs of promises : https://promisesaplus.com/
 */
class QueryablePromise {
  constructor (promise) {
    // Don't modify any promise that has been already modified
    if (Symbol.for('isPending') in promise) return promise

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

    Object.defineProperty(queryablePromise, Symbol.for('isFulfilled'), { get: function () { return isFulfilled } })
    Object.defineProperty(queryablePromise, Symbol.for('isPending'), { get: function () { return isPending } })
    Object.defineProperty(queryablePromise, Symbol.for('isRejected'), { get: function () { return isRejected } })
    Object.defineProperty(queryablePromise, Symbol.for('done'), { get: function () { return !isPending } }) // official terminology would be 'isSettled' or 'isResolved' (https://stackoverflow.com/questions/29268569/what-is-the-correct-terminology-for-javascript-promises)

    return queryablePromise
  }

  /**
   * Returns a resolved Promise and immediately mark it as 'done'
   */
  static resolve (value) {
    const promise = Promise.resolve(value)

    promise[Symbol.for('isFulfilled')] = true
    promise[Symbol.for('isPending')] = false
    promise[Symbol.for('isRejected')] = false
    promise[Symbol.for('done')] = true

    return promise
  }
}

export default QueryablePromise
