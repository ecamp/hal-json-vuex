import EmbeddedCollection from './EmbeddedCollection'
import Resource, { EmbeddedCollectionType } from './Resource'
import StoreData from './StoreData'

interface ApiActions {
    get: (uriOrEntity: string | Resource | StoreData, forceReload?: boolean) => Resource
    reload: (uriOrEntity: string | Resource | StoreData | EmbeddedCollectionType) => Promise<Resource | EmbeddedCollection>
    post: (uriOrEntity: string | Resource, data: unknown) =>Promise<Resource>
    patch: (uriOrEntity: string | Resource, data: unknown) => Promise<Resource>
    del: (uriOrEntity: string | Resource) => Promise<string | void>
    isUnknown: (uri: string) => boolean
}

export default ApiActions
