import Collection from './Collection'

type EmbeddedCollectionMeta = {
    _meta: {
        load?: Promise<EmbeddedCollectionMeta>
        reload: {
            uri: string
            property: string
        }
    }
}

/**
 * Subtype for an embedded collection with no self link (no standalone store entry, exists only with its parent)
 */
 type EmbeddedCollection = Collection & EmbeddedCollectionMeta

export { EmbeddedCollection, EmbeddedCollectionMeta }
export default EmbeddedCollection
