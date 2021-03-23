/**
 * Generic interface for a standalone Resource (e.g. a HAl resource with an own store entry and a self link)
 * Can be a collection or a single entity
 */
interface Resource {
    _meta: {
        self: string | null
        load: Promise<Resource>
        loading: boolean
        deleting?: boolean
    }

    $reload: () => Promise<Resource>
    $post: (data: unknown) => Promise<Resource>
    $patch: (data: unknown) => Promise<Resource>
    $del: () => Promise<string | void>

    /**
     * for collections only
     */
    $loadItems?: () => Promise<Array<Resource>>
    items?: Array<Resource>
    allItems?: Array<Resource>
}

/**
 * Subtype for an embeddeed collection with no self link (no standalone store entry, exists only with its parent)
 */
type EmbeddedCollectionType = {
    _meta: {
        load?: Promise<EmbeddedCollectionType>
        reload: {
            uri: string
            property: string
        }
    }
}

export { Resource, EmbeddedCollectionType }
export default Resource
