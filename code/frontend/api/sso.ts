import { PREFIX_URL, baseURL, request } from './base'

export const getTextinSSOInfo = (params?: any) => {
  return request({
    baseURL,
    method: 'get',
    url: PREFIX_URL + '/api/v1/sso/info',
    params: params
  })
}
export const loginByTextinSSO = (params?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/sso/login',
    data: params
  })
}
