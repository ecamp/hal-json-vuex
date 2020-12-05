import QueryablePromise from '../QueryablePromise'

interface StoreData {
    _meta: {
        self: string
        load: QueryablePromise<StoreData>
        loading: boolean
    }
}

export default StoreData
