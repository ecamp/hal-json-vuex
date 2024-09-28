interface ExternalConfig {
    apiName?: string
    avoidNPlusOneRequests?: boolean
    forceRequestedSelfLink?: boolean
}

interface InternalConfig extends ExternalConfig {
  apiRoot?: string
}

export type { InternalConfig, ExternalConfig }
export default ExternalConfig
