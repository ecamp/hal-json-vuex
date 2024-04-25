import StoreData from './interfaces/StoreData'

import { MutationTree } from 'vuex/types'

export const state = {}
export type State<StoreType> = Record<string, StoreData<StoreType>>

export const mutations: MutationTree<State<unknown>> = {
  /**
   * Adds a placeholder into the store that indicates that the entity with the given URI is currently being
   * fetched from the API and not yet available.
   * @param state Vuex state
   * @param uri   URI of the object that is being fetched
   */
  addEmpty<StoreType> (state: State<StoreType>, uri: string) : void {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    state[uri] = { _meta: { self: uri, loading: true } }
  },
  /**
   * Adds entities loaded from the API to the Vuex store.
   * @param state Vuex state
   * @param data  An object mapping URIs to entities that should be merged into the Vuex state.
   */
  add<StoreType> (state: State<StoreType>, data: Record<string, unknown>) : void {
    Object.keys(data).forEach(uri => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      state[uri] = data[uri]

      state[uri]._meta.loading = false
      state[uri]._meta.reloading = false
    })
  },
  /**
   * Marks a single entity in the Vuex store as reloading, meaning a reloading network request is currently ongoin.
   * @param state Vuex state
   * @param uri   URI of the entity that is currently being reloaded
   */
  reloading<StoreType> (state: State<StoreType>, uri: string) : void {
    if (state[uri]) state[uri]._meta.reloading = true
  },
  /**
   * Marks a single entity in the Vuex store as normal again, after it has been marked as reloading before.
   * @param state Vuex state
   * @param uri   URI of the entity that is currently being reloaded
   */
  reloadingFailed<StoreType> (state: State<StoreType>, uri: string) : void {
    if (state[uri]) state[uri]._meta.reloading = false
  },
  /**
   * Removes a single entity from the Vuex store.
   * @param state Vuex state
   * @param uri   URI of the entity to be removed
   */
  purge<StoreType> (state: State<StoreType>, uri: string) : void {
    delete state[uri]
  },
  /**
   * Removes all entities from the Vuex store.
   * @param state Vuex state
   * @param uri   URI of the entity to be removed
   */
  purgeAll<StoreType> (state: State<StoreType>) : void {
    Object.keys(state).forEach(uri => {
      delete state[uri]
    })
  },
  /**
   * Marks a single entity in the Vuex store as deleting, meaning the process of deletion is currently ongoing.
   * @param state Vuex state
   * @param uri   URI of the entity that is currently being deleted
   */
  deleting<StoreType> (state: State<StoreType>, uri: string) : void {
    if (state[uri]) state[uri]._meta.deleting = true
  },
  /**
   * Marks a single entity in the Vuex store as normal again, after it has been marked as deleting before.
   * @param state Vuex state
   * @param uri   URI of the entity that failed to be deleted
   */
  deletingFailed<StoreType> (state: State<StoreType>, uri: string) : void {
    if (state[uri]) state[uri]._meta.deleting = false
  }
}

export default {
  mutations
}
