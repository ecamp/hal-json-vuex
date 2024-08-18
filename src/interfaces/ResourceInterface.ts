import { StoreData, VirtualStoreData } from './StoreData'

/**
 * Generic interface for a standalone ResourceInterface (e.g. a HAl resource with an own store entry and a self link)
 * Can be a collection or a single entity
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ResourceInterface<ResourceType extends ResourceInterface = any> {
    _meta: {
        self: string | null
        selfUrl: string | null
        load: Promise<ResourceType>
        loading: boolean
        deleting?: boolean
    }

    _storeData?: StoreData // optional, because LoadingResource has no _storeData

    $reload: () => Promise<ResourceType>
    $post: (data: unknown) => Promise<ResourceType | null>
    $patch: (data: unknown) => Promise<ResourceType>
    $del: () => Promise<string | void>
    $href: (relation: string, templateParams: Record<string, string | number | boolean>) => Promise<string | undefined>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface VirtualResource<Type extends ResourceInterface = any> extends ResourceInterface<Type> {
    _storeData: VirtualStoreData<Type>
}

export { ResourceInterface, VirtualResource }
export default ResourceInterface
