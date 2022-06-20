import { AxiosRequestConfig } from 'axios'

interface Options {
    axiosRequestInterceptor?: (config: AxiosRequestConfig) => AxiosRequestConfig
}

export default Options
