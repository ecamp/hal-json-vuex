import ResourceInterface from './ResourceInterface'

type ApiActionGet =  <Type extends ResourceInterface>(uriOrEntity?: string | Type) => Type
type ApiActionReload = <Type extends ResourceInterface>(uriOrEntity: string | Type) => Promise<Type>
type ApiActionPost = <Type extends ResourceInterface>(uriOrEntity: string | Type, data: unknown) => Promise<Type | null>
type ApiActionPatch = <Type extends ResourceInterface>(uriOrEntity: string | Type, data: unknown) => Promise<Type>
type ApiActionDel = <Type extends ResourceInterface>(uriOrEntity: string | Type) => Promise<string | void>
type ApiActionHref = <Type extends ResourceInterface>(uriOrEntity: string | Type, relation: string, templateParams) => Promise<string | undefined>

interface ApiActions {
    get: ApiActionGet
    reload: ApiActionReload
    post: ApiActionPost
    patch: ApiActionPatch
    del: ApiActionDel
    href: ApiActionHref
    isUnknown: (uri: string) => boolean
}

export default ApiActions
