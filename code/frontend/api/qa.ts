import { baseURL, PREFIX_URL, request } from './base'

export const getDocumentsByUuidsAPI = (uuids: string[]) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/document/list/by',
    data: { uuids }
  })
}
