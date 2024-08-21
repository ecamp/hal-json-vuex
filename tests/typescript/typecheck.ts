import axios from 'axios'
import { createStore, Store } from 'vuex'

import HalJsonVuexPlugin from '../../src/HalJsonVuexPlugin'
import { State } from '../../src/storeModule'

import type CollectionInterface from '../../src/interfaces/CollectionInterface'
import type ResourceInterface from '../../src/interfaces/ResourceInterface'

/* eslint-disable no-unused-expressions */

export type ResourceReference<T extends ResourceInterface<T>> = () => T;

export type CollectionType<
    Item extends ResourceInterface<Item>,
    Self extends CollectionInterface<Item, Self> = CollectionInterface<Item>,
> = CollectionInterface<Item, Self>;

type SingleEndpointResource<T extends ResourceInterface<T>> = (params: { id: string }) => T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryEndpointResources<T extends ResourceInterface<T>, Param = Record<string, any>> = (
    params?: Param,
) => CollectionType<T>;

interface PeriodEntity extends ResourceInterface<PeriodEntity> {
  name: string
}

interface CampEntity extends ResourceInterface<CampEntity> {
  organizer: string
  period: ResourceReference<PeriodEntity>
}

interface RootEndpoint extends ResourceInterface<RootEndpoint> {
  camps: SingleEndpointResource<CampEntity> & QueryEndpointResources<CampEntity>
}

axios.defaults.baseURL = 'http://localhost'
const store: Store<State<unknown>> = createStore({})
const api = HalJsonVuexPlugin(store, axios, {})

api.get<RootEndpoint>().camps({ id: '' }).organizer
api.get<RootEndpoint>().camps({ id: '' }).$reload().then((camp) => camp.organizer)
api.get<RootEndpoint>().camps({ id: '' }).period().name
api.get<RootEndpoint>().camps({ id: '' }).period()._meta.load.then((period) => period.name)
api.get<RootEndpoint>().camps().items.map((item) => item.organizer)
