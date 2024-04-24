import ResourceInterface from './ResourceInterface'
import { Link, StoreData } from './StoreData'

interface CollectionInterface<T extends ResourceInterface = ResourceInterface> extends ResourceInterface<CollectionInterface<T> & Link> {
    items: Array<T>
    allItems: Array<T>
    $loadItems: () => Promise<CollectionInterface<T>>
}

export default CollectionInterface
