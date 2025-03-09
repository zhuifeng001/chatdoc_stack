import type { Func } from '@/types'
import type { CanvasBadgeOptions, CanvasPolygonOptions, CanvasRectOptions } from '@intsig/canvas-mark'

export type PageItem = {
  w: number
  width?: number
  page_width?: number
  h: number
  height?: number
  page_height?: number
  rate?: number
  imgLoadPromise: Promise<boolean>
  index: number
  text: string
  error?: string
  url: string
  areas?: any[]
  lines?: any[]
}

export type IUMarkProps = {
  ifCanMark?: boolean
  iuMarkType?: string
  onMarkChange?: Func
}

export type MarkBox = {
  page: number
  position: number[]
  classNames: string[]
  style?: Record<string, string>
  attrs?: Record<string, string>
  active?: boolean
  canvasStyleOptions?: Partial<CanvasRectOptions | CanvasPolygonOptions | CanvasBadgeOptions>
  data?: any
}
export type CreateMarkOption = {
  active?: boolean
  activeSelector?: string
  empty?: boolean
  forceActive?: boolean
}
export type RemoveMarkOption = {
  page?: number
  attr?: string
  selector?: string
}

export type IPage = {
  id: string
  w: number // 自定义
  width: number // 定义标准
  page_width?: number // 接口返回
  page_height?: number
  h: number
  height: number
  index: number
  ocr?: any
  angle?: number

  areas?: any[]
  lines?: any[]

  url: string
  imgLoadPromise?: Promise<boolean>
  _ocr?: any
}

export type PageDataArgs = {
  pageList?: IPage[]
  index?: number
  page?: IPage
}

export type EdgeOptions = {
  padding?: number
  gap?: number
}

export type LocationResponse = {
  left: number
  width: number
}

export type OperationProps = {
  scale: number
  radio?: number
  disabled?: boolean
  hideDrag?: boolean
  textControlVisible?: boolean
}
