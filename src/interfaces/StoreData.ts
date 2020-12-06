import QueryablePromise from '../QueryablePromise'

type StoreData = {
    _meta: {
        self: string
        load: QueryablePromise<StoreData>
        loading: boolean
    }
}

type Link = {
    href: string
}

type TemplatedLink = Link & {
    templated: string
}

type Collection = {
    items: Array<Link>
}

export { StoreData, Link, TemplatedLink, Collection }

export default StoreData
