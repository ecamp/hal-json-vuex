import Resource from './Resource'
import QueryablePromise from '../QueryablePromise'

interface ApiActions {
    get: (uriOrEntity: string | Resource, forceReload?: boolean) => Resource
    reload: (uriOrEntity: string | Resource) => QueryablePromise<Resource>
    post: (uriOrEntity: string | Resource, data: unknown) => QueryablePromise<Resource>
    patch: (uriOrEntity: string | Resource, data: unknown) => QueryablePromise<Resource>
    del: (uriOrEntity: string | Resource) => QueryablePromise<Resource>
    isUnknown: (uri: string) => boolean
}

export default ApiActions
