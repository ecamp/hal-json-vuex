import Collection from './Collection'

/**
 * Subtype for an embeddeed collection with no self link (no standalone store entry, exists only with its parent)
 */
 type EmbeddedCollection = Collection & {
    _meta: {
        reload: {
            uri: string
            property: string
        }
    }
}

export { EmbeddedCollection }
export default EmbeddedCollection
