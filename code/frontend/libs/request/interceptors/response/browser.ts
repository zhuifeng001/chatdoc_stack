import { useUser } from '@/containers/knowledge-base/store/useUser'
import { notification } from 'ant-design-vue'
import type { AxiosResponse, AxiosError } from 'axios'
import { isClient } from '~/utils/env'

export function responseResolve(response: AxiosResponse) {
  if (response.config.url === '/query') {
    return response.headers
  }
  return response.data
}

export function responseReject(error: AxiosError<any>) {
  // 忽略错误
  if (error?.config?.fetchOptions?.__ignore_error__) return Promise.reject(error)
  console.log('error :>> ', error)
  if (error && error.config) {
    const headers = error.config.headers
    // 忽略以下错误提示
    if (error?.response?.status === 401) {
      notification.error({
        message: '错误',
        description: '登录失效，请重新登录',
        type: 'error',
        duration: 3,
        top: '100px'
      })
      setTimeout(() => {
        useUser().clearUser()
        location.assign('/')
        // useUser().showLogin()
      }, 3000)
      return Promise.reject(error)
    }
    // 需要修改，清除loading
  }
  const err = {
    status: error.response && error.response.status,
    errcode: '',
    message: (error.response && error.response.data && error.response.data.message) || error.message || '未知错误',
    stack: error.stack || '',
    xerrcode: '',
    xerrmsg: ''
  }

  if (error && error.config) {
    let errorMessage
    if (err.message.indexOf('timeout') !== -1) {
      errorMessage = '当前访问请求过多，请稍候再试'
    } else if (error.message === 'Network Error') {
      if (navigator.onLine) {
        errorMessage = `当前服务器不可用(code:${error.response?.status})` // 请联系客服 400-608-3063
      } else {
        errorMessage = '当前网络不可用，请检查你的网络或稍候再试'
      }
    }
    if (errorMessage) {
      // 需要修改，弹出错误提示
    }
  }

  if (error.response && error.response.data) {
    err.errcode = error.response.data.errcode
    err.message = error.response.data.message
  }
  if (error.response && error.response.headers) {
    err.xerrcode = error.response.headers['x-is-error-code']
    err.xerrmsg = error.response.headers['x-is-error-msg']
  }

  if (error && error.config) {
    // 需要修改，添加请求错误处理
    let msg = error.message
    const result = error.response
    if (result) {
      const { data } = result as any
      msg = data.msg || data.enMsg || data.message
    } else if (msg) {
      if (msg === 'Network Error') {
        msg = '网络错误,请检查网络!'
      }
    } else {
      msg = '未知错误,请重试!'
    }
    console.log('msg, error.message :>> ', msg, error.message)
    isClient &&
      notification.error({
        message: '错误',
        description: msg || error.message,
        type: 'error',
        duration: 3,
        top: '100px'
      })

    return Promise.reject(error)
  }

  return Promise.reject(err)
}
