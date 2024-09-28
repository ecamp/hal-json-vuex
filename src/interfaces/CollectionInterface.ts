import type ResourceInterface from './ResourceInterface'

/**
 * Generic interface for a collection ResourceInterface (e.g. a HAl resource with an own store entry and a self link)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CollectionInterface<ItemType extends ResourceInterface, ResourceType extends CollectionInterface<ItemType, ResourceType> = any> extends ResourceInterface<ResourceType> {
    items: Array<ItemType>
    allItems: Array<ItemType>
    $loadItems: () => Promise<CollectionInterface<ItemType, ResourceType>>
}

export default CollectionInterface
