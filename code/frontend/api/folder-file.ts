import { PREFIX_URL, baseURL, request } from './base'

export const getFolderChildrenAPI = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/folder/data/children',
    data
  })
}

export const deleteFolderAPI = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/folder/delete',
    data
  })
}

export const moveFolderAPI = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/folder/move',
    data
  })
}

export const updateFolderAPI = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/folder/update',
    data
  })
}

// 文档操作
export const updateDocumentAPI = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/document/update',
    data
  })
}

export const deleteDocumentAPI = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/document/delete',
    data
  })
}

export const moveDocumentAPI = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/document/move',
    data
  })
}
