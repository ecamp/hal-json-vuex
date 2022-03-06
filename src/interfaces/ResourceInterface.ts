import StoreData from './StoreData'

/**
 * Generic interface for a standalone ResourceInterface (e.g. a HAl resource with an own store entry and a self link)
 * Can be a collection or a single entity
 */
interface ResourceInterface {
    _meta: {
        self: string | null
        load: Promise<ResourceInterface>
        loading: boolean
        deleting?: boolean
    }

    _storeData?: StoreData

    $reload: () => Promise<ResourceInterface>
    $post: (data: unknown) => Promise<ResourceInterface | null>
    $patch: (data: unknown) => Promise<ResourceInterface>
    $del: () => Promise<string | void>
    $href: (relation: string, templateParams: Record<string, string | number | boolean>) => Promise<string | undefined>
}

export { ResourceInterface }
export default ResourceInterface
