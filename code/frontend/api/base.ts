import '@/utils/polyfill'
import { isClient } from '~/utils/env'
import '@/utils/web-cache'
import createRequest from '@/libs/request/index-new'

export const request = createRequest()

export const PREFIX_URL = ''

/**
 * 获取运行时的baseURL，区分客户端和服务端
 * @param clientAPI
 * @param serverDummyAPIName
 * @returns
 */
export const getRuntimeBaseURL = (clientAPI: string, serverDummyAPIName: string) => {
  let API = ''
  // 浏览器
  if (isClient) {
    API = clientAPI || ''
  }
  // 服务端
  else {
    API = serverDummyAPIName
  }
  return API
}

const getBaseURLForProd = () => {
  return getRuntimeBaseURL((globalThis as any).__KB_API_VAR__, '__KB_API__') || import.meta.env.KB_API
}
export const baseURL = getBaseURLForProd()
console.log('baseURL :>> ', baseURL, import.meta.env.DEV, import.meta.env.KB_API)
