import Resource from './Resource'
import QueryablePromise from '../QueryablePromise'

interface StoreData {
    _meta: {
        self: string
        load: QueryablePromise<Resource>
    }
}

export default StoreData
