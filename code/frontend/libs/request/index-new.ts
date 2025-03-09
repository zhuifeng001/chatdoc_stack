import axios from 'axios'
import type { AxiosError, AxiosInstance } from 'axios'
import { requestResolve, requestReject } from './interceptors/request/browser'
import { responseResolve, responseReject } from './interceptors/response/browser'

const _setupInterceptors = (axios: AxiosInstance) => {
  // setup interceptor for request
  axios.interceptors.request.use(requestResolve, requestReject)
  // setup interceptor for response
  axios.interceptors.response.use(responseResolve, responseReject)
}

const createRequest = () => {
  const clientRequest = axios.create({
    // withCredentials: true
    // maxContentLength: 1024 * 1024 * 1024,
    // maxBodyLength: 1024 * 1024 * 1024,
    decompress: false
  })
  _setupInterceptors(clientRequest)

  return clientRequest
}

_setupInterceptors(axios)

export default createRequest
