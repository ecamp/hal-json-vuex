import { ResourceInterface } from './ResourceInterface'
import { CollectionInterface } from './CollectionInterface'

/**
 * Reference to a resource. This is used to create properties in a ResourceInterface that point to other resources.
 * @param T      The type of the resource.
 * @param Params Parameters that can be passed to the request, e.g. to modify the resource request.
 */
export type ResourceReference<T extends ResourceInterface<T>, Params = undefined> = Params extends undefined
    ? () => T
    : (arg: Params) => T;

/**
 * Reference to a collection. This is used to create properties in a ResourceInterface that point to a resource collection.
 * @param Item   The type of the items in the collection.
 * @param Params Parameters that can be passed to the request, e.g. to filter the collection.
 * @param Self   The type of the collection itself. This is used to be able to create additional fields
 *               besides items, allItems on the collection itself.
 */
export type CollectionReference<
    Item extends ResourceInterface<Item>,
    Params = undefined,
    Self extends CollectionInterface<Item, Self> = CollectionInterface<Item>,
> = Params extends undefined
    ? () => CollectionInterface<Item, Self>
    : (params: Params) => CollectionInterface<Item, Self>;
