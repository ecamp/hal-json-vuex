import type { ResourceInterface } from './ResourceInterface'

export interface ApiActions {
    get:<ResourceType extends ResourceInterface> (uriOrEntity?: string | ResourceInterface) => ResourceType
    reload:<ResourceType extends ResourceInterface> (uriOrEntity: string | ResourceInterface) => Promise<ResourceType>
    post:<ResourceType extends ResourceInterface> (uriOrEntity: string | ResourceInterface, data: unknown) => Promise<ResourceType | null>
    patch:<ResourceType extends ResourceInterface> (uriOrEntity: string | ResourceInterface, data: unknown) => Promise<ResourceType>
    del: (uriOrEntity: string | ResourceInterface) => Promise<string | void>
    href: (uriOrEntity: string | ResourceInterface, relation: string, templateParams?:Record<string, string | number | boolean>) => Promise<string | undefined>
    isUnknown: (uri: string) => boolean
}

export interface StoreActions {
    purge<Item extends ResourceInterface> (uriOrEntity: string | Item): void
    purgeAll (): void
}

export type HalJsonVuex = ApiActions & StoreActions
