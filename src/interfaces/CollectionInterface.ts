import ResourceInterface from './ResourceInterface'
import { StoreDataCollection } from './StoreData'

interface CollectionInterface extends ResourceInterface {
    _storeData: StoreDataCollection

    items: Array<ResourceInterface>
    allItems: Array<ResourceInterface>
    $loadItems: () => Promise<CollectionInterface>
}

export default CollectionInterface
