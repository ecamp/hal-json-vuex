import Resource from './Resource'

interface StoreData {
    _meta: {
        self: string
        load: Promise<Resource>
    }
}

export default StoreData
