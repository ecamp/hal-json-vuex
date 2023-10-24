interface ExternalConfig {
    apiName?: string
    avoidNPlusOneRequests?: boolean
    forceRequestedSelfLink?: boolean
}

interface InternalConfig extends ExternalConfig {
  apiRoot?: string
}

export { InternalConfig, ExternalConfig }
export default ExternalConfig
