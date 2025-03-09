import { randomString } from '@/utils/crypto'

export const KB_FOLDER_ID = 0
export const OTHER_FOLDER_ID = -1

export const formatFile = file => {
  if (!file) return file
  file._id ??= randomString(8)
  file.type = 'file'
  file.title ??= file.name
  file._selection = false
  file._active = false
  file._checked = false
  file._expand = false
  return file
}

export const formatFolder = folder => {
  if (!folder) return folder
  folder._id ??= randomString(8)
  folder.id ??= folder.folderId
  folder.title ??= folder.folderName || folder.name
  folder.children ??= folder.list || []
  folder.type = folder.id === KB_FOLDER_ID ? 'kb' : 'folder'
  folder._selection = false
  folder._active = false
  folder._checked = false
  folder._expand = false
  return folder
}

export enum FileStatusEnums {
  UPLOADED = 0, // 上传完成
  DOC_PARSED = 10, // docparser解析成功
  CATALOG_PARSED = 20, // 目录解析成功
  SUCCEED = 30, // 成功
  FAILED = -1 //失败
}

export const isParsingFile = (status: FileStatusEnums) =>
  [FileStatusEnums.UPLOADED, FileStatusEnums.DOC_PARSED, FileStatusEnums.CATALOG_PARSED].includes(status)
export const isSucceedFile = (status: FileStatusEnums) => FileStatusEnums.SUCCEED === status
export const isFailedFile = (status: FileStatusEnums) => FileStatusEnums.FAILED === status
