import type { CollectionInterface } from './interfaces/CollectionInterface'
import type { ResourceInterface } from './interfaces/ResourceInterface'
import type { ResourceReference, CollectionReference } from './interfaces/References'
import type { HalJsonVuex } from './interfaces/Interfaces'
import HalJsonVuexPlugin from './HalJsonVuexPlugin'
import Resource from './Resource'
import Collection from './Collection'
import LoadingResource from './LoadingResource'

export type { ResourceInterface, CollectionInterface, HalJsonVuex }
export type { ResourceReference, CollectionReference }

export { HalJsonVuexPlugin, Resource, Collection, LoadingResource }

export default HalJsonVuexPlugin
