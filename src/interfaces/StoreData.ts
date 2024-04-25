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

type VirtualStoreDataMeta = {
    _meta: {
        virtual: boolean
        owningResource: string
        owningRelation: string
    }
}

type StoreDataEntity<Type> = Type & StoreDataMeta & {
    _meta: {
        load: SerializablePromise<StoreDataEntity<Type>>
    }
}

type StoreDataCollection<Type> = Type & StoreDataMeta & {
    items: Array<Link>,
    _meta: {
        load: SerializablePromise<StoreDataCollection<Type>>
    }
}

type StoreData<Type> = StoreDataEntity<Type> | StoreDataCollection<Type>

type VirtualStoreData<Type> = VirtualStoreDataMeta & StoreData<Type>

export { StoreData, VirtualStoreData, Link, VirtualLink, TemplatedLink, StoreDataEntity, StoreDataCollection, SerializablePromise }

export default StoreData
