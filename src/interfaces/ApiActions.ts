import ResourceInterface from './ResourceInterface'

interface ApiActions {
    get: (uriOrEntity: string | ResourceInterface) => ResourceInterface
    reload: (uriOrEntity: string | ResourceInterface) => Promise<ResourceInterface>
    post: (uriOrEntity: string | ResourceInterface, data: unknown) => Promise<ResourceInterface | null>
    patch: (uriOrEntity: string | ResourceInterface, data: unknown) => Promise<ResourceInterface>
    del: (uriOrEntity: string | ResourceInterface) => Promise<string | void>
    href: (uriOrEntity: string | ResourceInterface, relation: string, templateParams) => Promise<string | undefined>
    isUnknown: (uri: string) => boolean
}

export default ApiActions
