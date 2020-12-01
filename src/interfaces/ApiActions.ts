import Resource from './Resource'

interface ApiActions {
    get: (uriOrEntity: string | Resource, forceReload?: boolean) => Resource
    reload: (uriOrEntity: string | Resource) => Promise<Resource>
    post: (uriOrEntity: string | Resource, data: unknown) => Promise<Resource>
    patch: (uriOrEntity: string | Resource, data: unknown) => Promise<Resource>
    del: (uriOrEntity: string | Resource) => Promise<Resource>
    isUnknown: (uri: string) => boolean
}

export default ApiActions
