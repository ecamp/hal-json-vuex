interface Resource {
    _meta: {
        self: string
        load: Promise<Resource>
    }

    $reload: () => Promise<Resource>
    $loadItems: () => Promise<Resource>
    $post: (data: unknown) => Promise<Resource>
    $patch: (data: unknown) => Promise<Resource>
    $del: () => Promise<Resource>

    items?: Array<Resource>
}

export default Resource
