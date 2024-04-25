import ResourceInterface from './ResourceInterface'
import { StoreDataCollection } from './StoreData'

interface CollectionInterface<StoreType> extends ResourceInterface<StoreType> {
    _storeData: StoreDataCollection<StoreType>

    items: Array<ResourceInterface<StoreType>>
    allItems: Array<ResourceInterface<StoreType>>
    $loadItems: () => Promise<CollectionInterface<StoreType>>
}

export default CollectionInterface
