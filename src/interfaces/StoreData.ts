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

type StoreDataEntity = (StoreDataMeta | VirtualStoreDataMeta) & {
    items: never,
    _meta: {
        load: SerializablePromise<StoreDataEntity>
    }
}

type StoreDataCollection = (StoreDataMeta | VirtualStoreDataMeta) & {
    items: Array<Link>,
    _meta: {
        load: SerializablePromise<StoreDataCollection>
    }
}

type StoreData = StoreDataEntity | StoreDataCollection

export { StoreData, Link, VirtualLink, TemplatedLink, StoreDataEntity, StoreDataCollection, SerializablePromise }

export default StoreData
