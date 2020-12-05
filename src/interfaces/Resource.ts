import QueryablePromise from '../QueryablePromise'

interface Resource {
    _meta: {
        self: string | null
        load: QueryablePromise<Resource>
        loading: boolean
    }

    $reload: () => QueryablePromise<Resource>
    $loadItems: () => QueryablePromise<Resource>
    $post: (data: unknown) => QueryablePromise<Resource>
    $patch: (data: unknown) => QueryablePromise<Resource>
    $del: () => QueryablePromise<Resource>

    items?: Array<Resource>
    allItems?: Array<Resource>
}

export default Resource
