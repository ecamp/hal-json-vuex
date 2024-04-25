import type ResourceInterface from './ResourceInterface'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CollectionInterface<ItemType extends ResourceInterface, ResourceType extends CollectionInterface<ItemType, ResourceType> = any> extends ResourceInterface<ResourceType> {
    items: Array<ItemType>
    allItems: Array<ItemType>
    $loadItems: () => Promise<CollectionInterface<ItemType, ResourceType>>
}

export default CollectionInterface
