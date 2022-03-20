/**
 * Adds the passed query parameters to the end of the passed URI.
 * @param uri      to be processed
 * @returns string URI with sorted query parameters
 */
function addQuery (uri: string, queryParams: Record<string, string | number | boolean | Array<string | number | boolean>>): string {
  if (isEmpty(queryParams)) return uri
  if (typeof uri !== 'string') return uri

  const queryStart = uri.indexOf('?')
  const prefix = queryStart === -1 ? uri : uri.substring(0, queryStart)
  const query = new URLSearchParams(queryStart === -1 ? '' : uri.substring(queryStart + 1))

  Object.keys(queryParams).forEach(key => {
    const paramValue = queryParams[key]
    if (Array.isArray(paramValue)) {
      paramValue.forEach(value => query.append(key, value.toString()))
    } else {
      query.append(key, paramValue.toString())
    }
  })

  if ([...query.keys()].length) {
    return `${prefix}?${query.toString()}`
  }

  return uri
}

function isEmpty (obj) {
  return obj === null || undefined === obj || (Object.keys(obj).length === 0 && Object.getPrototypeOf(obj) === Object.prototype)
}

export default addQuery
