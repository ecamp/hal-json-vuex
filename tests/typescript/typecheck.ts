import axios from 'axios'
import { createStore, Store } from 'vuex'

import HalJsonVuexPlugin from '../../src/HalJsonVuexPlugin'
import { State } from '../../src/storeModule'

/* eslint-disable no-unused-expressions */

import type ResourceInterface from '../../src/interfaces/ResourceInterface'
import type { ResourceReference, CollectionReference } from '../../src/interfaces/References'

type SingleEndpointResource<T extends ResourceInterface<T>> = ResourceReference<T, { id: string }>;
type QueryEndpointResources<T extends ResourceInterface<T>, Params = undefined> = CollectionReference<T, Params>;

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
