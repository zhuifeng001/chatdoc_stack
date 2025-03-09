import { PREFIX_URL, baseURL, request } from './base'

export const getHotSpotsAPI = () => {
  return request({
    baseURL,
    method: 'get',
    url: PREFIX_URL + '/api/v1/hotspots'
  })
}

export const getFilterResourceAPI = (params?: any) => {
  return request({
    baseURL,
    method: 'get',
    url: PREFIX_URL + '/api/v1/document/filter/config',
    params: params
  })
}

export const getDocumentImage = (filePath: string) => {
  return baseURL + PREFIX_URL + `/api/v1/common/public/download?type=cover&path=${filePath}`
}

export const getPublicImage = (filePath: string, cover?: string) => {
  return baseURL + PREFIX_URL + `/api/v1/common/public/download?path=${filePath}${cover ? '&' + 'type=' + cover : ''}`
}
