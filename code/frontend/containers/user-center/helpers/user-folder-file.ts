import { KBFileTypeEnums } from './index'
export type UserKBFile = {
  name: string
  uuid: string
  status: number
  id: number
  _id: string
  _type: 'file'
  _checked?: boolean
  extraData: any
}
export type UserKBFolder = {
  name: string
  id: number
  _id: string
  _type: 'folder'
  _checked?: boolean
}

export type UserKBFolderOrFile = UserKBFile | UserKBFolder

export type MoveKBFolderParam = {
  id: number
  targetId: number
}

export type UploadFileItem = {
  errorMsg?: any
  file: File | Blob
  name: string
  status: string
  percent: number
  loaded: number
  size: number
  type: string
}

export const formatFile = (file: UserKBFile) => {
  if (!file) return file
  file._id ??= randomString(8)
  file._type = 'file'
  return file
}

export const formatFolder = (folder: UserKBFolder) => {
  if (!folder) return folder
  folder._id ??= randomString(8)
  folder._type = 'folder'
  return folder
}

export const formatFolderFile = (item: UserKBFolderOrFile) => {
  if (!item) return item
  if ('uuid' in item) {
    return formatFile(item)
  } else {
    return formatFolder(item)
  }
}

export const formatFolderFileList = (list: UserKBFolderOrFile[] = []) => {
  return list.map(item => formatFolderFile(item))
}

export const sortFolderFileList = (list: UserKBFolderOrFile[] = []) => {
  const folders = list.filter(o => o._type === 'folder')
  const files = list.filter(o => o._type === 'file')
  return [...folders, ...files]
}

/**
 * 根据name后缀判断文件类型，然后过滤出文件
 * @param list
 * @param type 1file 2image 3folder
 * @returns
 */
export const filterFolderFileList = (list: UserKBFolderOrFile[] = [], type) => {
  if (!type) return list // 查询全部
  return list.filter(item => {
    if (type === KBFileTypeEnums.FOLDER) {
      return item._type === 'folder'
    } else {
      const name = item.name || ''
      const suffix = name.substring(name.lastIndexOf('.') + 1)
      if (type === KBFileTypeEnums.FILE) {
        return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'txt'].includes(suffix)
      }
      if (type === KBFileTypeEnums.IMAGE) {
        return ['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(suffix)
      }
    }
  })
}

export const searchFolderFileList = (list: UserKBFolderOrFile[] = [], name: string) => {
  if (!name) return list
  // 分解查询名字为单个字符的数组
  const queryChars = Array.from(new Set(name)) // 使用Set去重

  // 过滤列表，只返回包含至少一个查询字符的元素
  return list.filter(item => {
    // 检查列表中的每一项是否包含查询名字中的任意字符
    return queryChars.some(char => item.name.includes(char))
  })
}

// 根据文件名后缀判断文件类型
export const getFileType = (name: string) => {
  const suffix = name.substring(name.lastIndexOf('.') + 1)
  if (['doc', 'docx'].includes(suffix)) return 'Word'
  if (['pdf'].includes(suffix)) return 'Pdf'
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(suffix)) return 'Image'
}
