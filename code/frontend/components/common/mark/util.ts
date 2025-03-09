import type { ShapeInstance } from '@intsig/canvas-mark'
import { cloneDeep } from 'lodash-es'

export const dataDiffIndex = 'data-diff-index'
export const dataPageIndex = 'data-page-index'
export const dataLayoutIndex = 'data-layout-index'
export const dataSearchIndex = 'data-search-index'
export const dataStructuredIndex = 'data-structured-index'
export const dataTOCIndex = 'data-toc-index'
export const dataExtractIndex = 'data-extract-index'
export const getAttrDiffIndex = i => `[${dataDiffIndex}="${i}"]`
export const getAttrPageIndex = i => `[${dataPageIndex}="${i}"]`
export const getAttrLayoutIndex = i => `[${dataLayoutIndex}="${i}"]`
export const getAttrSearchIndex = i => `[${dataSearchIndex}="${i}"]`
export const getAttrStructuredIndex = i => `[${dataStructuredIndex}="${i}"]`
export const getAttrTOCIndex = i => `[${dataTOCIndex}="${i}"]`
export const getAttrExtractIndex = i => `[${dataExtractIndex}="${i}"]`

/**
 * 将多个点位合并，并且以行拆分返回
 * @param boxes
 * @returns
 */
export const getMultiLineBoxes = (boxes: number[][] = []) => {
  if (!boxes?.length) return []
  boxes = cloneDeep(boxes)
  const resBoxes: any[] = []
  const newBoxIndex: any[] = []
  boxes.forEach((b, bi) => {
    if (bi != 0 && b[1] > boxes[bi - 1][1] + 10) {
      newBoxIndex.push(bi - 1)
    }
  })
  if (!newBoxIndex.length || newBoxIndex[newBoxIndex.length - 1] != boxes.length) {
    newBoxIndex.push(boxes.length - 1)
  }
  newBoxIndex.forEach((nb, nbi) => {
    let newBox: any[] = []
    const index = nbi == 0 ? 0 : newBoxIndex[nbi - 1] + 1
    newBox = boxes[index]
    boxes.forEach((b, bi) => {
      if (bi >= index && bi <= nb) {
        newBox[1] = Math.min(newBox[1], b[1])
        newBox[5] = Math.max(newBox[5], b[5])
      }
    })
    newBox[2] = boxes[nb][2]
    resBoxes.push(newBox)
  })
  return resBoxes
}

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
