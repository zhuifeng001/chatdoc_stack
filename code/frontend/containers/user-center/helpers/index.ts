export enum KBFileTypeEnums {
  FILE = '1',
  IMAGE = '2',
  FOLDER = '3'
}

export const KBFileTypeNameMap = {
  [KBFileTypeEnums.FILE]: '文稿',
  [KBFileTypeEnums.IMAGE]: '图像',
  [KBFileTypeEnums.FOLDER]: '文件夹'
}

export enum KBSortEnums {
  UPDATE_TIME = 'updateTime',
  CREATE_TIME = 'createTime',
  FILE_SIZE = 'size',
  NAME = 'name'
}

export const KBSortNameMap = {
  [KBSortEnums.UPDATE_TIME]: '更新时间',
  [KBSortEnums.CREATE_TIME]: '创建时间',
  [KBSortEnums.FILE_SIZE]: '文件大小',
  [KBSortEnums.NAME]: '名称'
}

export enum ChatTypeEnums {
  Document = 1, // 指定文档问答
  Global = 2 // 全局问答
}
