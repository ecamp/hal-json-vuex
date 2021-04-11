import Resource from './Resource'
import { StoreDataCollection } from './StoreData'

type Collection = Resource & {
    _storeData: StoreDataCollection

    items: Array<Resource>
    allItems: Array<Resource>
    $loadItems: () => Promise<Collection>
}

export default Collection
