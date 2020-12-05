import QueryablePromise from '../QueryablePromise'

interface Resource {
    _meta: {
        self: string
        load: QueryablePromise<Resource>
    }

    $reload: () => QueryablePromise<Resource>
    $loadItems: () => QueryablePromise<Resource>
    $post: (data: unknown) => QueryablePromise<Resource>
    $patch: (data: unknown) => QueryablePromise<Resource>
    $del: () => QueryablePromise<Resource>

    items?: Array<Resource>
}

export default Resource
