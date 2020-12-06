import Resource, { EmbeddedCollectionType } from './Resource'

interface ApiActions {
    get: (uriOrEntity: string | Resource | EmbeddedCollectionType, forceReload?: boolean) => Resource
    reload: (uriOrEntity: string | Resource | EmbeddedCollectionType) => Promise<Resource>
    post: (uriOrEntity: string | Resource, data: unknown) =>Promise<Resource>
    patch: (uriOrEntity: string | Resource, data: unknown) => Promise<Resource>
    del: (uriOrEntity: string | Resource) => Promise<Resource>
    isUnknown: (uri: string) => boolean
}

export default ApiActions
