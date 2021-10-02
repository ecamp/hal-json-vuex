import EmbeddedCollection, { EmbeddedCollectionMeta } from './EmbeddedCollection'
import Resource from './Resource'
import StoreData from './StoreData'

interface ApiActions {
    get: (uriOrEntity: string | Resource | StoreData, forceReload?: boolean) => Resource
    reload: (uriOrEntity: string | Resource | StoreData | EmbeddedCollectionMeta) => Promise<Resource | EmbeddedCollection>
    post: (uriOrEntity: string | Resource, data: unknown) => Promise<Resource | null>
    patch: (uriOrEntity: string | Resource, data: unknown) => Promise<Resource>
    del: (uriOrEntity: string | Resource) => Promise<string | void>
    href: (uriOrEntity: string | Resource, relation: string, templateParams) => Promise<string | undefined>
    isUnknown: (uri: string) => boolean
}

export default ApiActions
