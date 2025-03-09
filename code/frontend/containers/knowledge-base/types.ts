export const defaultMarkStyle = Object.freeze({
  fillStyle: 'transparent',
  strokeStyle: 'var(--primary-color)',
  lineDash: []
})

export const activeMarkStyle = Object.freeze({
  fillStyle: 'rgba(72, 119, 255, 0.2)',
  strokeStyle: 'var(--primary-color)',
  lineDash: []
})

export const dashMarkStyle = Object.freeze({
  fillStyle: 'transparent',
  strokeStyle: 'var(--primary-color)',
  lineDash: [5, 5]
})

/**
 * 版面类型
 */
export enum DocumentResultStructuredType {
  TEXT_BLOCK = 'textblock',
  TABLE = 'table',
  IMAGE = 'image',
  HEADER = 'header',
  FOOTER = 'footer'
}

/**
 * 版面内容的类型
 */
export enum DocumentResultContentType {
  IMAGE = 'image',
  LINE = 'line'
}

export enum DocumentResultImageType {
  STAMP = 'stamp'
}

export type DocumentResultTextBlock = {
  type: DocumentResultStructuredType.TEXT_BLOCK
  pos: number[]
  content: number[]
}
export type DocumentResultImage = {
  type: DocumentResultStructuredType.IMAGE
  pos: number[]
  content: number
  lines?: DocumentResultContentLine[]

  _src?: string
}
export type DocumentResultFooter = {
  type: DocumentResultStructuredType.HEADER | DocumentResultStructuredType.FOOTER
  pos: number[]
  content: DocumentResultTextBlock[]
}

export type DocumentResultTable = {
  type: DocumentResultStructuredType.TABLE
  rows_height: number[]
  columns_width: number[]
  pos: number[]
  rows: number
  cols: number
  cells: DocumentResultTableCell[]
}

export type DocumentResultStructuredItem =
  | DocumentResultTable
  | DocumentResultTextBlock
  | DocumentResultImage
  | DocumentResultFooter
export type DocumentResultStructured = DocumentResultStructuredItem[]

export type DocumentResultTableCell = {
  row: number
  row_span: number
  col: number
  col_span: number
  content: DocumentResultTextBlock[]
  pos: number[]
  _i: number
}

export type DocumentResultContentLine = {
  type: DocumentResultContentType.LINE
  id: number
  pos: number[]
  text: string
  char_pos: number[][]
}

export type DocumentResultContentImage = {
  type: DocumentResultContentType.IMAGE
  sub_type: DocumentResultImageType
  id: number
  pos: number[]
  size: [number, number]
  data: { region: number[] }
  text: string
}
export type DocumentResultContent = DocumentResultContentLine | DocumentResultContentImage

export type DocumentResultLineItem = {
  area_type: DocumentResultContentType.LINE
  area_index: number
  position: number[]
  text: string
  char_positions: number[][]
}

export type DocumentResultLineImage = {
  type: DocumentResultContentType.IMAGE
  char_positions: Array<number | null>
  area_index: number
  position: number[]
}
export type DocumentResultLine = DocumentResultLineItem | DocumentResultLineImage

export type DocumentResultPage = {
  content: DocumentResultContent[]
  structured: DocumentResultStructured
  image: { base64: string; url: string; image_id?: string }
  areas: Array<any>
  lines: DocumentResultLine
  num: number
  height: number
  width: number
  page_id: string
  page_index: number
  type: DocumentResultContentType
  angle: number

  // 首次加载用，仅有图片相关数据
  image_url?: string
  image_id?: string
}

export type DocumentMarkItem = {
  index: string
  page: number
  // pos 只有四个值，是第四个点坐标和第二个点坐标组成的数组
  pos: number[]
  text?: string
  type: string
}

export type DocumentPageItem = {
  width: number
  height: number
  getUrlHeader?: () => Record<string, string>
  formatUrl?: (res: { data: string; type: string; headers: Record<string, string> }) => string
  _getUrl: () => string | Promise<string>
  _src?: string // base64
  url: string
  areas: DocumentResultStructured
  lines: DocumentResultContent[] // 图像切边展示用
  mark_list: DocumentMarkItem[]
  index: number
  error: number
  rate: number
  text: string
  // 搜索用 ------ start
  textList: string
  areaIndexMap: number[]
  areaTypeMap: string[]
  positionList: number[][]
  // 搜索用 ------ end
}

export type InternalCustomFields = {
  _checked?: boolean
  _selection?: boolean
  _active?: boolean
  _edit?: boolean
  _title?: string
  _autoActive?: boolean
  _expand?: boolean
  _parent?: UserFolder | UserKB
  _dummy?: boolean
}

export type UserKB = {
  _id: number | string
  id: number | string
  folderId: number | string
  key: number | string
  title: string
  type: 'kb'
  children: UserFile[]
  sort: number
} & InternalCustomFields

export type UserFolder = {
  _id: number | string
  id: number | string
  folderId: number | string
  key: number | string
  name: string
  title: string
  type: 'folder'
  children: UserFile[]
  sort: number
  documentCount: number
  userId: number
} & InternalCustomFields

export type UserFile = {
  _id: number | string
  id: number | string
  uuid: string
  key: number | string
  name: string
  title: string
  type: 'file'
  folderId: number | string
  updateTime: string
  sort: number
  status: any
  _parent?: UserFolder | UserKB
  extraData?: {
    company: string
    cover: string
    financeDate: string
    pageNumber: 18
  }
} & InternalCustomFields

export type UserFileData = UserKB | UserFolder | UserFile

export interface FileSearchCondition {
  id?: number
  keyword?: string
  sort?: string
}
