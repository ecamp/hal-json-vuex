import { StoreData, VirtualStoreData } from './StoreData'

/**
 * Generic interface for a standalone ResourceInterface (e.g. a HAl resource with an own store entry and a self link)
 * Can be a collection or a single entity
 */
interface ResourceInterface<StoreType> {
    _meta: {
        self: string | null
        selfUrl: string | null
        load: Promise<ResourceInterface<StoreType>>
        loading: boolean
        deleting?: boolean
    }

    _storeData?: StoreData<StoreType> // optional, because LoadingResource has no _storeData

    $reload: () => Promise<ResourceInterface<StoreType>>
    $post: (data: unknown) => Promise<ResourceInterface<StoreType> | null>
    $patch: (data: unknown) => Promise<ResourceInterface<StoreType>>
    $del: () => Promise<string | void>
    $href: (relation: string, templateParams: Record<string, string | number | boolean>) => Promise<string | undefined>
}

interface VirtualResource<StoreType> extends ResourceInterface<StoreType> {
    _storeData: VirtualStoreData<StoreType>
}

export { ResourceInterface, VirtualResource }
export default ResourceInterface
