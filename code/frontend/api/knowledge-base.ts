import { PREFIX_URL, baseURL, request } from './base'

export const userLogin = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/user/login',
    data: data
  })
}

export const sendSMS = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/common/sms',
    data: data
  })
}

export const userLogout = () => {
  return request({
    baseURL,
    method: 'get',
    url: PREFIX_URL + '/api/v1/user/logout'
  })
}

export const getUserInfo = () => {
  return request({
    baseURL,
    method: 'get',
    url: PREFIX_URL + '/api/v1/user/info'
  })
}

export const getKBDocumentDetail = (params: any) => {
  return request({
    baseURL,
    method: 'get',
    url: PREFIX_URL + '/api/v1/document/download',
    params: {
      ...params,
      type: 'docparser'
    }
  })
}
export const getKBDocumentCatalog = (params: any) => {
  return request({
    baseURL,
    method: 'get',
    url: PREFIX_URL + '/api/v1/document/download',
    params: {
      ...params,
      type: 'catalog'
    }
  })
}
export const getKBDocumentMergeData = (params: any) => {
  return request({
    baseURL,
    method: 'get',
    url: PREFIX_URL + '/api/v1/document/download',
    params: {
      ...params,
      type: 'merge'
    },
    fetchOptions: {
      __ignore_error__: true
    }
  })
}

export const getKbDownloadImageUrl = () => baseURL + PREFIX_URL + '/api/v1/document/download'

export const getKBDocumentImage = (params: any, options: any = {}) => {
  return request({
    baseURL,
    method: 'get',
    url: PREFIX_URL + '/api/v1/document/download',
    params: {
      ...params,
      type: 'imageList'
    },
    ...options
  })
}

export const getKBDocumentBrief = (params: any, options: any = {}) => {
  return request({
    baseURL,
    method: 'get',
    url: PREFIX_URL + '/api/v1/document/download',
    params: {
      ...params,
      type: 'brief'
    },
    ...options,
    fetchOptions: {
      __ignore_error__: true
    }
  })
}

/**
 * 发起提问
 */
export const initiateQuestionAPI = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/chat/infer',
    data
  })
}

export const getCommonProblemAPI = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/chat/recommend',
    data
  })
}

export const getChatHistoryAPI = (params?: any) => {
  return request({
    baseURL,
    method: 'get',
    url: PREFIX_URL + '/api/v1/chat/history',
    params
  })
}

export const updateChatNameAPI = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/chat/history/update',
    data: data
  })
}

export const getChatDetailAPI = (params?: any) => {
  return request({
    baseURL,
    method: 'get',
    url: PREFIX_URL + '/api/v1/chat/history/detail',
    params
  })
}
export const deleteChatAPI = (data?: any) => {
  return request({
    baseURL,
    method: 'post',

    url: PREFIX_URL + '/api/v1/chat/history/delete',
    data
  })
}
export const feedbackChatAPI = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/chat/feedback',
    data
  })
}
export const PDF2DOC_API = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/common/pdf-to-word',
    data,
    headers: {
      'Content-Type': 'application/octet-stream'
    }
  })
}

export const getKBLibraryList = (data?: any) => {
  return request({
    baseURL,
    method: 'get',
    url: PREFIX_URL + '/api/v1/library/list',
    params: data
  })
}

export const getMyLibraryList = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/library/data/tree',
    data
  })
}

export const getKBDocumentList = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/document/list',
    data
  })
}

export const getKBDocumentSummary = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/document/summary',
    data
  })
}

export const reParseKBDocumentAPI = (params?: any) => {
  return request({
    baseURL,
    method: 'get',
    url: PREFIX_URL + '/api/v1/document/reparse',
    params
  })
}

export const getDocumentByIds = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/document/list/by/filter',
    data
  })
}
export const getPublicDocumentByIds = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/document/list/public',
    data
  })
}

export const addUserFolder = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/folder/add',
    data
  })
}
export const updateUserFolder = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/folder/update',
    data
  })
}
export const deleteUserFolder = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/folder/delete',
    data
  })
}

export const addUserFile = async (data: any, params: any, uploadProgressCallback?) => {
  let loaded = 0
  let total = 0
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/document/upload',
    data,
    params,
    headers: {
      'Content-Type': 'application/octet-stream'
    },
    onUploadProgress: progressEvent => {
      loaded = progressEvent.loaded
      total = progressEvent.total as number
      if (uploadProgressCallback) uploadProgressCallback(progressEvent)
    }
  }).then(res => {
    if (loaded !== total) {
      console.log('uploaded not equal >>>>>>>>>>>>>>>>', loaded, total)
      loaded = total
    }
    uploadProgressCallback({ loaded, total })
    return res
  })
}

export const updateFolderFileSort = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/document/folder/sort',
    data
  })
}
export const updateFileFolder = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/document/move',
    data
  })
}
export const deleteUserFile = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/document/delete',
    data
  })
}
export const updateUserFile = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/document/update',
    data
  })
}
export const getQaRecords = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/chat/qa/list',
    data
  })
}
export const getQaDetail = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/chat/answer/detail',
    data
  })
}
export const getQaDataset = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/common/proxy/dateset_metadata',
    data
  })
}
export const getChatChart = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/chat/statistics',
    data
  })
}
export const getRecycleRecords = (data?: any) => {
  return request({
    baseURL,
    method: 'post',
    url: PREFIX_URL + '/api/v1/recycle/list',
    data
  })
}
