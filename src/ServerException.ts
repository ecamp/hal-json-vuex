import type { AxiosError, AxiosResponse } from 'axios'

/**
 * Error class for returning server exceptions (attaches Axios response object to error)
 */
export default class ServerException extends Error {
    public response: AxiosResponse

    /**
     * @param response Axios reponse object
     * @param message  Error message to prepend to the response message
     * @param error
     */
    public constructor (response: AxiosResponse, message: string, error: AxiosError) {
      super(message + ' (status ' + response.status + '): ' + error.message)
      this.name = 'ServerException'
      this.response = response
    }
}
