type Link = {
    href: string
}

type VirtualLink = Link & {
    virtual?: boolean
}

type TemplatedLink = Link & {
    templated: string
}

type SerializablePromise<T> = Promise<T> & {
    toJSON?: () => string
}

type StoreDataMeta = {
    _meta: {
        self: string
        loading: boolean
        deleting: boolean
        reloading: boolean
    }
}

type VirtualStoreDataMeta = StoreDataMeta & {
    _meta: {
        virtual: boolean
        owningResource: string
        owningRelation: string
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StoreDataEntity<T = any> = T & StoreDataMeta & {
    _meta: {
        load: SerializablePromise<StoreDataEntity<T>>
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StoreDataCollection<T = any> = T & StoreDataMeta & {
    items: Array<Link>,
    _meta: {
        load: SerializablePromise<StoreDataCollection<T>>
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StoreData<T = any> = StoreDataEntity<T> | StoreDataCollection<T>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VirtualStoreData<T = any> = StoreData<T> & VirtualStoreDataMeta

export { StoreData, VirtualStoreData, Link, VirtualLink, TemplatedLink, StoreDataEntity, StoreDataCollection, SerializablePromise }

export default StoreData
