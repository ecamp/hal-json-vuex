import { Inject } from '@nuxt/types/app'

interface ExternalConfig {
    apiName?: string
    avoidNPlusOneRequests?: boolean
    forceRequestedSelfLink?: boolean
    nuxtInject?: Inject
}

interface InternalConfig extends ExternalConfig {
  apiRoot?: string
}

export { InternalConfig, ExternalConfig }
export default ExternalConfig
