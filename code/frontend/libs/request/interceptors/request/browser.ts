import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

export const getBaseHeader = () => {
  return {
    Authorization: storage.getItem('KB_TOKEN') || ''
  }
}

export function requestResolve(config: InternalAxiosRequestConfig) {
  // 需要修改，添加请求header，loading
  Object.assign(config.headers, getBaseHeader())

  return config
}

export function requestReject(error: AxiosError) {
  if (error && error.config) {
    // 需要修改，添加请求错误处理
  }
  return Promise.reject(error)
}
