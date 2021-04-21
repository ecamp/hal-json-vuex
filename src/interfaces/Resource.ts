import StoreData from './StoreData'

/**
 * Generic interface for a standalone Resource (e.g. a HAl resource with an own store entry and a self link)
 * Can be a collection or a single entity
 */
type Resource = {
    _meta: {
        self: string | null
        load: Promise<Resource>
        loading: boolean
        deleting?: boolean
    }

    _storeData?: StoreData

    $reload: () => Promise<Resource>
    $post: (data: unknown) => Promise<Resource>
    $patch: (data: unknown) => Promise<Resource>
    $del: () => Promise<string | void>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $href: (relation: string, templateParams: any) => Promise<string | undefined>
}

export { Resource }
export default Resource
