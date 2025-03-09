import { getRuntimeBaseURL, request } from './base'

export const creativeBaseURL =
  getRuntimeBaseURL((globalThis as any).__AI_API_VAR__, '__AI_API__') || import.meta.env.VITE_KNOWLEDGE_BASE_AI_API
console.log('creativeBaseURL :>> ', creativeBaseURL)

const PREFIX_URL = ''
export const createArticle = (data?: any) => {
  return request({
    baseURL: creativeBaseURL,
    method: 'post',
    url: PREFIX_URL + '/articles',
    data
  })
}

export const getArticle = (params?: any, options: any = {}) => {
  return request({
    baseURL: creativeBaseURL,
    method: 'get',
    url: PREFIX_URL + `/articles/${params.id}`,
    params,
    ...options
  })
}

export const getArticles = (params?: any) => {
  return request({
    baseURL: creativeBaseURL,
    method: 'get',
    url: PREFIX_URL + '/articles',
    params
  })
}

export const renameArticle = (id: number, data?: any) => {
  return request({
    baseURL: creativeBaseURL,
    method: 'patch',
    url: PREFIX_URL + `/articles/${id}/rename`,
    data
  })
}

export const deleteArticle = (id: number) => {
  return request({
    baseURL: creativeBaseURL,
    method: 'delete',
    url: PREFIX_URL + `/articles/${id}`
  })
}

export const saveArticleHistory = (id: string, data?: { content?: string; delta?: string }) => {
  return request({
    baseURL: creativeBaseURL,
    method: 'put',
    url: PREFIX_URL + `/articles/${id}`,
    data
  })
}

export const saveArticleImage = (id: number, data: FormData) => {
  // return parseFileToBase64(file)
  return request({
    baseURL: creativeBaseURL,
    method: 'post',
    url: PREFIX_URL + `/articles/${id}/images`,
    data: data
  })
}

export const getArticleImage = (url: string) => {
  return creativeBaseURL + PREFIX_URL + url
}
