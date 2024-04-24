import { StoreData, VirtualStoreData } from './StoreData'

/**
 * Generic interface for a standalone ResourceInterface (e.g. a HAl resource with an own store entry and a self link)
 * Can be a collection or a single entity
 */
interface ResourceInterface<T extends ResourceInterface<any> = ResourceInterface<any>> {
    _meta: {
        self: string | null
        selfUrl: string | null
        load: Promise<T>
        loading: boolean
        deleting?: boolean
    }

    _storeData?: StoreData<T> // optional, because LoadingResource has no _storeData

    $reload: () => Promise<T>
    $post: (data: unknown) => Promise<T | null>
    $patch: (data: unknown) => Promise<T>
    $del: () => Promise<string | void>
    $href: (relation: string, templateParams: Record<string, string | number | boolean>) => Promise<string | undefined>
}

interface VirtualResource<T extends ResourceInterface<any> = ResourceInterface<any>> extends ResourceInterface<T> {
    _storeData: VirtualStoreData<T>
}

export { ResourceInterface, VirtualResource }
export default ResourceInterface
