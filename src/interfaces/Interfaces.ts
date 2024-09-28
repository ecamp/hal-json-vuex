import type { ResourceInterface } from './ResourceInterface'

/**
 * This interface defines the API actions that can be performed with the HalJsonVuex plugin.
 */
export interface ApiActions<RootEndpoint extends ResourceInterface = ResourceInterface> {
    get:<ResourceType extends ResourceInterface = RootEndpoint> (uriOrEntity?: string | ResourceInterface) => ResourceType
    reload:<ResourceType extends ResourceInterface = RootEndpoint> (uriOrEntity: string | ResourceInterface) => Promise<ResourceType>
    post:<ResourceType extends ResourceInterface = RootEndpoint> (uriOrEntity: string | ResourceInterface, data: unknown) => Promise<ResourceType | null>
    patch:<ResourceType extends ResourceInterface = RootEndpoint> (uriOrEntity: string | ResourceInterface, data: unknown) => Promise<ResourceType>
    del: (uriOrEntity: string | ResourceInterface) => Promise<string | void>
    href: (uriOrEntity: string | ResourceInterface, relation: string, templateParams?:Record<string, string | number | boolean>) => Promise<string | undefined>
    isUnknown: (uri: string) => boolean
}

/**
 * These methods only modify the Vuex store. They do not interact with the API.
 */
export interface StoreActions {
    purge<Item extends ResourceInterface> (uriOrEntity: string | Item): void
    purgeAll (): void
}

/**
 * This is the main interface for the HalJsonVuex plugin. It combines the API actions and the store actions.
 */
export type HalJsonVuex<RootEndpoint extends ResourceInterface = ResourceInterface> = ApiActions<RootEndpoint> & StoreActions
