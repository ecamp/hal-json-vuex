import type ResourceInterface from './interfaces/ResourceInterface'

/**
 * Sorts the query parameters in a URI, keeping the values of duplicate keys in order.
 * Example:
 * sortQueryParams('localhost/api/books?q=something&dup=true&alpha=0&dup=false')
 * // 'localhost/api/books?alpha=0&dup=true&dup=false&q=something'
 * @param uri      to be processed
 * @returns string URI with sorted query parameters
 */
function sortQueryParams (uri: string): string {
  const queryStart = uri.indexOf('?')
  if (queryStart === -1) return uri

  const prefix = uri.substring(0, queryStart)
  const query = new URLSearchParams(uri.substring(queryStart + 1))
  const modifiedQuery = new URLSearchParams();

  [...new Set(query.keys())].sort().forEach((key) => {
    query.getAll(key).forEach((value) => {
      modifiedQuery.append(key, value)
    })
  })

  if ([...modifiedQuery.keys()].length) {
    return `${prefix}?${modifiedQuery.toString()}`
  }
  return prefix
}

/**
 * Extracts the URI from an entity (or uses the passed URI if it is a string) and normalizes it for use in
 * the Vuex store.
 * @param uriOrEntity     entity or literal URI string
 * @param baseUrl         common URI prefix to remove during normalization
 * @returns {null|string} normalized URI, or null if the uriOrEntity argument was not understood
 */
function normalizeEntityUri (uriOrEntity: string | ResourceInterface | null = '', baseUrl = ''): string | null {
  const uri = typeof uriOrEntity === 'string' ? uriOrEntity : uriOrEntity?._meta?.self

  return normalizeUri(uri, baseUrl)
}

/**
 * Normalize a URI by sorting the query parameters and removing a given prefix.
 * @param uri             to be normalized
 * @param baseUrl         prefix to remove from the beginning of the URI if present
 * @returns {null|string} normalized URI, or null if uri is not a string
 */
function normalizeUri (uri: unknown, baseUrl: string): string | null {
  if (typeof uri !== 'string') return null
  const sorted = sortQueryParams(uri)
  const simpleReplace = sorted.replace(new RegExp(`^${baseUrl}`), '')
  if (baseUrl && simpleReplace === uri) {
    try {
      const parsedBaseUrl = new URL(baseUrl)
      const uriHasHost = getHostOfUri(uri) !== undefined
      if (parsedBaseUrl.host && uriHasHost) {
        return simpleReplace
      }

      const pathname = parsedBaseUrl.pathname.replace(/\/$/, '')
      return sorted.replace(new RegExp(`^${pathname}`), '')
    } catch (_) {
    }
  }
  return simpleReplace
}

/**
 * returns the host of uri if present, or undefined if new URL throws exception.
 * @param uri
 */
function getHostOfUri (uri: string): string | undefined {
  try {
    return new URL(uri).host
  } catch (_) {
    return undefined
  }
}

export default normalizeEntityUri
