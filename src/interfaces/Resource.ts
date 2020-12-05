import QueryablePromise from '../QueryablePromise'

interface Resource {
    _meta: {
        self: string | null
        load: QueryablePromise<Resource>
        loading: boolean
    }

    $reload: () => Promise<Resource>
    $loadItems: () => Promise<Resource>
    $post: (data: unknown) => Promise<Resource>
    $patch: (data: unknown) => Promise<Resource>
    $del: () => Promise<Resource>

    items?: Array<Resource>
    allItems?: Array<Resource>
}

export default Resource
