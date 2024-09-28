import type { ResourceInterface } from './ResourceInterface'

export interface ApiActions<RootEndpoint extends ResourceInterface = ResourceInterface> {
    get:<ResourceType extends ResourceInterface = RootEndpoint> (uriOrEntity?: string | ResourceInterface) => ResourceType
    reload:<ResourceType extends ResourceInterface = RootEndpoint> (uriOrEntity: string | ResourceInterface) => Promise<ResourceType>
    post:<ResourceType extends ResourceInterface = RootEndpoint> (uriOrEntity: string | ResourceInterface, data: unknown) => Promise<ResourceType | null>
    patch:<ResourceType extends ResourceInterface = RootEndpoint> (uriOrEntity: string | ResourceInterface, data: unknown) => Promise<ResourceType>
    del: (uriOrEntity: string | ResourceInterface) => Promise<string | void>
    href: (uriOrEntity: string | ResourceInterface, relation: string, templateParams?:Record<string, string | number | boolean>) => Promise<string | undefined>
    isUnknown: (uri: string) => boolean
}

export interface StoreActions {
    purge<Item extends ResourceInterface> (uriOrEntity: string | Item): void
    purgeAll (): void
}

export type HalJsonVuex<RootEndpoint extends ResourceInterface = ResourceInterface> = ApiActions<RootEndpoint> & StoreActions
