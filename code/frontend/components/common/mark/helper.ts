import type { MarkInstance, ShapeInstance } from '@intsig/canvas-mark'
import type { MarkBox } from './types'

export enum MenuState {
  TABLE = 'TABLE', // 目录
  IMAGE = 'IMAGE' // 缩略图
}

export interface MarkSearchLine {
  page: number
  active?: boolean
}

export const MIN_SCALE = 0.2
export const MAX_SCALE = 3

export const dataPageIndex = 'data-page-index'
export const getAttrPageIndex = i => `[${dataPageIndex}="${i}"]`

export const getTallestMark = (shapes: ShapeInstance[] = []) => {
  let shapeIndexByTop = 0
  let shapeTop: number = shapes?.[0]?.options.top || 0
  shapes?.forEach((s, i) => {
    if (shapeTop > s.options.top) {
      shapeTop = s.options.top
      shapeIndexByTop = i
    }
  })
  return shapes?.[shapeIndexByTop]
}

type MarkDrawShapeParams = {
  type: 'badge' | 'polygon' | 'rect'
  visible?: boolean | undefined
  active?: boolean | undefined
}

export const createMarkShape = (markInstance: MarkInstance, markBox: MarkBox, options?: MarkDrawShapeParams) => {
  if (!markInstance) return
  const { drawRect, drawPolygon, drawBadge } = markInstance
  const { type } = options || { type: 'polygon' }
  const position = markBox.position
  const selector: string[] = (markBox.classNames || []).map(o => `.${o}`)
  if (markBox.attrs) {
    for (const key in markBox.attrs) {
      selector.push(`[${key}="${markBox.attrs[key]}"]`)
    }
  }

  const map = {
    rect: drawRect,
    polygon: drawPolygon,
    badge: drawBadge
  }

  const drawGraph = map[type]
  const shape = drawGraph(
    {
      position: position,
      data: markBox,
      index: markBox.page,
      options: {
        selector,
        ...markBox.canvasStyleOptions
      }
    },
    options
  )

  if (options?.active) {
    shape?.activated(true, { block: 'center' })
  }

  return shape
}
