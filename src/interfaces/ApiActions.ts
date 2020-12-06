import Resource from './Resource'
import EmbeddedCollection from '../EmbeddedCollection'

interface ApiActions {
    get: (uriOrEntity: string | Resource | EmbeddedCollection, forceReload?: boolean) => Resource
    reload: (uriOrEntity: string | Resource | EmbeddedCollection) => Promise<Resource>
    post: (uriOrEntity: string | Resource, data: unknown) =>Promise<Resource>
    patch: (uriOrEntity: string | Resource, data: unknown) => Promise<Resource>
    del: (uriOrEntity: string | Resource) => Promise<string | void>
    isUnknown: (uri: string) => boolean
}

export default ApiActions
