import { AxiosResponse } from 'axios'

/**
 * Error class for returning server exceptions (attaches Axios response object to error)
 */
export default class ServerException extends Error {
    public response: AxiosResponse

    /**
     * @param response Axios reponse object
     * @param params Standard Error parameters
     */
    public constructor (response: AxiosResponse, message?: string) {
      super(message)

      if (!this.message) {
        this.message = 'Server error ' + response.status + ' (' + response.statusText + ')'
      }
      this.name = 'ServerException'
      this.response = response
    }
}
