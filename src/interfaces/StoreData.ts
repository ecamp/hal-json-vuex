type Link = {
    href: string
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

type StoreDataEntity = StoreDataMeta & {
    items: never,
    _meta: {
        load: SerializablePromise<StoreDataEntity>
    }
}

type StoreDataCollection = StoreDataMeta & {
    items: Array<Link>,
    _meta: {
        load: SerializablePromise<StoreDataCollection>
    }
}

type StoreData = StoreDataEntity | StoreDataCollection

export { StoreData, Link, TemplatedLink, StoreDataEntity, StoreDataCollection, SerializablePromise }

export default StoreData
