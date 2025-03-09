import type { RectStandardPosition } from '@intsig/canvas-mark'
import type { PluginProps } from '@intsig/canvas-mark/src/plugins'
import { mergePositions } from '@intsig/canvas-mark/src/utils/points'
import { rotatePointsWithPage } from '@intsig/canvas-mark/src/utils/rotate'
import { useShortcut } from '@intsig/canvas-mark/src/utils/useShortcut'
import { convertRectByPosition, inverseTransformPoint } from '@intsig/canvas-mark/src/utils/util'
import { throttle } from 'lodash-es'

export const CustomCopyPlugin = 'CustomCopyPlugin'
export const ShapeSelector = 'copy-block-mark'
const ShapeSelectedBgColor = 'rgb(26, 102, 255, 0.3)'

type ContentBlock = {
  content: number | number[]
  pos: number[]
  type: string
}

export const useCustomCopyPlugin = (props: PluginProps) => {
  ;(window as any).__props__ = props
  const { canvas, markInstance, markParams, markOptions } = props
  const pages = markOptions.pages || []

  let start = false
  let hasMark = false
  const offset: [number, number] = [0, 0]
  const startOffset: [number, number] = [0, 0]
  const lastOffset: [number, number] = [0, 0]
  const pageLineCollection = new Map()
  const pageShapeCollection = new Map()
  const pageRotateCharPosCollection = new Map()

  const onMousedownFn = (e: MouseEvent) => {
    // 不是左击
    if ((e as MouseEvent).button !== 0) {
      return
    }
    const event = e as MouseEvent
    // 不支持组合键
    if (event.altKey || event.ctrlKey || event.metaKey) return

    start = true
    ;[offset[0], offset[1]] = inverseTransformPoint(canvas, [event.x, event.y])
    ;[startOffset[0], startOffset[1]] = inverseTransformPoint(canvas, [event.offsetX, event.offsetY])
    hasMark = false
    removeCopyMark(pageShapeCollection)
    // cursorStyle = getCanvasCursor(canvas);
    const startPageIndex = markInstance.getPageByPoint(startOffset)
    const angle = markInstance.getInternalPage(startPageIndex)?.angle || 0
    // setCanvasCursor(canvas, getCursorByAngle(angle), true);
    pageLineCollection.clear()
  }

  const scrollTimer = { value: null as NodeJS.Timeout | null }
  const clearScrollTimer = () => {
    if (scrollTimer.value) {
      clearInterval(scrollTimer.value)
      scrollTimer.value = null
    }
  }

  const onMousemoveBase = (e: MouseEvent) => {
    if (!start) return
    const event = e as MouseEvent

    ;[lastOffset[0], lastOffset[1]] = inverseTransformPoint(canvas, [event.x, event.y])

    const directionX = lastOffset[0] - offset[0] > 0 ? 1 : -1
    const directionY = lastOffset[1] - offset[1] > 0 ? 1 : -1
    // 处理矩形选区，宽高存在正负值
    const genRect = () => {
      const width = lastOffset[0] - offset[0]
      const height = lastOffset[1] - offset[1]
      const options = {
        left: startOffset[0],
        top: startOffset[1],
        width,
        height
      }
      if (width < 0) {
        options.left = startOffset[0] + width
        options.width = -width
      }
      if (height < 0) {
        options.top = startOffset[1] + height
        options.height = -height
      }
      return options
    }
    const getPosition = () => {
      return [...startOffset, startOffset[0] + lastOffset[0] - offset[0], startOffset[1] + lastOffset[1] - offset[1]]
    }
    const selectRect = genRect()
    const startEndPos = getPosition()
    const startPageIndex = markInstance.getPageByPoint([startEndPos[0], startEndPos[1]])
    const endPageIndex = markInstance.getPageByPoint([startEndPos[2], startEndPos[3]])
    if (startPageIndex == null || endPageIndex == null) return

    const collectPageChar = (page: number) => {
      const angle = markInstance.getInternalPage(page)?.angle || 0

      // 先清空上一次当前页收集的数据
      const lineTextArr = pageLineCollection.get(page)
      lineTextArr && (lineTextArr.length = 0)

      const params = {
        angle,
        markInstance,
        markParams,
        page,
        pageItem: pages[page - 1],
        directionX,
        directionY,
        selectRect,
        pageLineCollection,
        pageRotateCharPosCollection
      }
      collectPage(params)

      renderShapeByPage({
        page,
        pageLineCollection,
        pageShapeCollection,
        markInstance
      })
      hasMark = true
    }

    let page = endPageIndex
    if (directionY > 0) {
      while (page >= Math.max(startPageIndex, endPageIndex - 1)) {
        collectPageChar(page)
        page--
      }
    } else {
      while (page <= Math.min(startPageIndex, endPageIndex + 1)) {
        collectPageChar(page)
        page++
      }
    }

    markInstance.render()
  }

  const updateMarkTranslate = (diff: number) => {
    const currentTranslate = markInstance.getTranslate()
    currentTranslate[1] += diff
    markInstance.updateTranslate(currentTranslate)
  }

  const onMousemoveFn = throttle(
    e => {
      // 自动往下滚
      clearScrollTimer()

      onMousemoveBase(e)

      const canvasRect = canvas.getBoundingClientRect()

      // 模拟自动滚动
      const gap = 20
      const minSpeed = 4
      if (e.x > canvasRect.left && e.x < canvasRect.right && canvasRect.bottom - e.y < gap) {
        const speed = Math.max(minSpeed, canvasRect.bottom - e.y)
        scrollTimer.value = setInterval(() => {
          if (!start) {
            clearScrollTimer()
            return
          }
          updateMarkTranslate(-5)
          onMousemoveBase({ x: e.x, y: e.y + 0.01 } as any)
        }, speed)
      } else if (e.x > canvasRect.left && e.x < canvasRect.right && e.y - canvasRect.top < gap) {
        const speed = Math.max(minSpeed, e.y - canvasRect.top)
        scrollTimer.value = setInterval(() => {
          if (!start) {
            clearScrollTimer()
            return
          }
          updateMarkTranslate(5)
          onMousemoveBase({ x: e.x, y: e.y + 0.01 } as any)
        }, speed)
      }
    },
    30,
    { leading: true, trailing: true }
  )

  const onMouseupFn = (e: MouseEvent) => {
    clearScrollTimer()
    if (!start) return
    start = false
    markOptions.onCopySelected?.(e, pageLineCollection)
  }

  const onClear = () => {
    hasMark = false
    removeCopyMark(pageShapeCollection)
  }

  const { registerEvent, destroy: destroyEvent } = useShortcut()

  const init = () => {
    registerEvent({
      el: document.body as any,
      event: 'keydown',
      shortcut: isMac ? 'Command + C' : 'Ctrl + C',
      callback: () => {
        markOptions.onCopySelected?.(null, pageLineCollection)
      }
    })
    document.body.addEventListener('mousedown', onClear)
    canvas.addEventListener('mousedown', onMousedownFn)
    window.addEventListener('mousemove', onMousemoveFn)
    window.addEventListener('mouseup', onMouseupFn)
  }
  const destroy = () => {
    destroyEvent()
    document.body.removeEventListener('mousedown', onClear)
    canvas.removeEventListener('mousedown', onMousedownFn)
    window.removeEventListener('mousemove', onMousemoveFn)
    window.removeEventListener('mouseup', onMouseupFn)
    clearScrollTimer()
  }

  return {
    name: 'CustomCopyPlugin',
    init,
    destroy,
    isDrag: () => start,
    hasMark: () => hasMark
  }
}

const removeCopyMark = (pageShapeCollection, page?: number) => {
  for (const [pi, shapes] of pageShapeCollection) {
    if (page && page !== pi) continue
    ;[...shapes.values()].forEach(t => t.destroy())
    shapes.clear()
  }
  if (page == null) {
    pageShapeCollection.clear()
  }
}

const renderShapeByPage = params => {
  const { page, pageLineCollection, pageShapeCollection, markInstance } = params
  const newMap = new Map()
  const map = pageShapeCollection.get(page)

  pageLineCollection.get(page)?.map(tc => {
    const positions = mergePositions(tc.pos)
    positions.map(pos => {
      const points = pos.join(',')
      let shape = map?.get(points) || newMap?.get(points)
      // 存在就继续使用
      if (shape) {
        map?.delete(points)
        newMap.set(points, shape)
        return
      }
      // 不存在就创建
      shape = markInstance.drawRect({
        index: page,
        position: pos,
        options: { strokeStyle: 'transparent', fillStyle: ShapeSelectedBgColor, selector: [ShapeSelector] }
      })
      if (shape) {
        newMap.set(points, shape)
      }
    })
  })
  if (map) {
    ;[...map.values()].forEach(s => s.destroy())
    map.clear()
  }
  pageShapeCollection.set(page, newMap)
}

const collectPage = options => {
  const {
    angle,
    page,
    pageItem,
    selectRect,
    directionX,
    directionY,
    pageLineCollection,
    markInstance,
    markParams,
    pageRotateCharPosCollection
  } = options
  const lines = pageItem.lines || []
  let position = markInstance.transformPositionByPageRect(selectRect, page)
  if (!position) return
  // 坐标小于0的，设置为0
  for (let i = 0; i < position.length; i++) {
    if (position[i] < 0) position[i] = 0
  }
  const selectedRealRect = convertRectByPosition(position)

  const startX = directionX > 0 ? selectedRealRect.left : selectedRealRect.left + selectedRealRect.width
  const startY = directionY > 0 ? selectedRealRect.top : selectedRealRect.top + selectedRealRect.height
  const endX = directionX > 0 ? selectedRealRect.left + selectedRealRect.width : selectedRealRect.left
  const endY = directionY > 0 ? selectedRealRect.top + selectedRealRect.height : selectedRealRect.top

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].text) continue
    const params = {
      angle,
      page,
      pageItem,
      line: lines[i],
      directionX,
      directionY,
      startX,
      startY,
      endX,
      endY,
      pageLineCollection,
      pageRotateCharPosCollection,
      markInstance
    }
    collectLine(params)
  }
}

const areaIndexCache = new Map<string, number>()
const getAreaIndexByContentId = (pageItem, contentItem) => {
  if (contentItem.id == null) return
  const cacheKey = `${pageItem.index}_${contentItem.id}`
  const cacheValue = areaIndexCache.get(cacheKey)
  if (cacheValue) return cacheValue

  const id = contentItem.id
  const matchContentId = (id: number, contentId?: number | number[] | any[], blocks?: ContentBlock[]) => {
    if (typeof contentId === 'number') {
      return contentId === id
    } else if (Array.isArray(contentId) && contentId.length) {
      // number[]
      if (typeof contentId[0] === 'number') {
        return contentId.includes(id)
      }
      // object[]
      else if (typeof contentId[0] === 'object') {
        return contentId.some(o => matchContentId(id, o.content, o.blocks))
      }
    } else if (Array.isArray(blocks) && blocks.length) {
      return blocks.some(o => matchContentId(id, o.content))
    }
  }
  const areaIndex = pageItem.areas.findIndex(area => {
    if (!area) return false
    if (area.type === 'table') {
      return !!area.cells?.some(o => matchContentId(id, o.content, o.blocks))
    }
    return matchContentId(id, area.content, area.blocks)
  })
  areaIndexCache.set(cacheKey, areaIndex)
  return areaIndex
}

const hasCharPos = line => (line.char_positions || line.char_pos || [])?.length > 0

const getLineCharPos = line => line.char_positions || line.char_pos || []
const getCharPos = (line, i: number) => getLineCharPos(line)?.[i] || []
const getLinePos = line => line.position || line.pos || []

const collectLine = params => {
  const {
    line,
    page,
    pageItem,
    angle = 0,
    directionX,
    directionY,
    startX,
    startY,
    endX,
    endY,
    pageLineCollection,
    markInstance,
    pageRotateCharPosCollection
  } = params
  if (!getLinePos(line)?.length) return

  const transformPos = (pos: number[]) => {
    let charPosCollection = pageRotateCharPosCollection.get(page)
    if (!charPosCollection) {
      pageRotateCharPosCollection.set(page, (charPosCollection = new Map()))
    }
    let cachePosKey = pos.join(',')
    let res = charPosCollection.get(cachePosKey)
    if (!res) {
      charPosCollection.set(cachePosKey, (res = []))
    }
    if (res[angle]) return res[angle]
    res[angle] = getPositionByCurrentAngle({
      position: pos,
      page,
      markInstance,
      angle: angle
    })
    return res[angle]
  }

  const linePosition = transformPos(getLinePos(line))
  const lineRect = convertRectByPosition(linePosition)
  if (!matchInScopeLine(angle, directionX, directionY, startX, startY, endX, endY, lineRect)) return
  let isMatchFirstLine = matchFirstLine(angle, directionX, directionY, startX, startY, endX, endY, lineRect)

  const textCollection = {
    index: page,
    text: '',
    pos: [] as number[][],
    areaIndex: -1
  }
  const collectText = (text: string, charPos: number[], pageItem, lineItem) => {
    textCollection.areaIndex = getAreaIndexByContentId(pageItem, lineItem)
    // 新版数据结构，contentId 与 area 没有关联关系，根据 contentId 获取不到对应 area
    const area = pageItem.areas[textCollection.areaIndex]
    const textType = area?.type || 'paragraph'
    // 如果框选到表格内部， 则选中整个表格
    if (textType === 'table') {
      const tablePos = area.pos || area.position
      textCollection.pos.push(tablePos)
    } else {
      textCollection.pos.push(charPos)
      textCollection.text += text
    }
  }

  /**
   * 支持没有字符点位，只有行点位的情况，直接选中行
   */
  const hasCharPosVar = hasCharPos(line)
  const charList = hasCharPosVar ? getLineCharPos(line) : [getLinePos(line)]

  for (let j = 0; j < charList.length; j++) {
    const charPos = hasCharPosVar ? getCharPos(line, j) : charList[j]
    const text = hasCharPosVar ? line.text[j] : line.text

    const options = {
      pageItem,
      lineItem: line,
      angle,
      directionX,
      directionY,
      startX,
      startY,
      endX,
      endY,
      isMatchFirstLine,
      lineRect,
      text,
      charPos,
      collectText,
      transformPos
    }
    const res = collectChar(options)
    if (res != null) continue
  }
  if (textCollection.pos.length) {
    let arr = pageLineCollection.get(page)
    if (!arr) {
      pageLineCollection.set(page, (arr = []))
    }
    arr.push(textCollection)
  }
}

const getPositionByCurrentAngle = params => {
  const { position, page, angle, markInstance } = params
  const internalPage = markInstance.getInternalPage(page)
  if (!internalPage) return position
  const newPosition = rotatePointsWithPage(
    position, //
    angle,
    internalPage.originWidth || 0,
    internalPage.originHeight || 0
  )
  if (!newPosition) return position
  return newPosition
}
const collectChar = options => {
  return isHorizontalAngle(options.angle) ? collectCharWithHorizontal(options) : collectCharWithVertical(options)
}

/**
 * 横向收集字符，角度是90 、270
 */
const collectCharWithHorizontal = options => {
  const {
    pageItem,
    lineItem,
    collectText,
    angle = 0,
    directionX,
    directionY,
    startX,
    startY,
    endX,
    endY,
    isMatchFirstLine,
    lineRect,
    text,
    charPos,
    transformPos
  } = options
  const charRect = convertRectByPosition(transformPos(charPos))

  // 处理第一行
  if (isMatchFirstLine) {
    if (
      startY < charRect.top + charRect.height && //
      endY > charRect.top
    ) {
      collectText(text, charPos, pageItem, lineItem)
      return true
    }
    if (
      startY > charRect.top && //
      endY < charRect.top + charRect.height
    ) {
      collectText(text, charPos, pageItem, lineItem)
      return true
    }
    return true
  }

  if (directionX > 0) {
    // 处理超出第一行
    if (
      endX > lineRect.left + lineRect.width && //
      startY > charRect.top
    ) {
      collectText(text, charPos, pageItem, lineItem)
      return true
    }
    // 包含整行
    if (
      startX < lineRect.left && //
      endX > lineRect.left + lineRect.width
    ) {
      collectText(text, charPos, pageItem, lineItem)
      return true
    }
    // 处理最后一行
    if (
      endX > lineRect.left && //
      endX < lineRect.left + lineRect.width &&
      endY < charRect.top + charRect.height
    ) {
      collectText(text, charPos, pageItem, lineItem)
      return true
    }
  } else {
    // 处理超出第一行
    if (
      endX < lineRect.left && //
      startY < charRect.top + charRect.height
    ) {
      collectText(text, charPos, pageItem, lineItem)
      return true
    }
    // 包含整行
    if (
      startX > lineRect.left + lineRect.width && //
      endX < lineRect.left
    ) {
      collectText(text, charPos, pageItem, lineItem)
      return true
    }
    // 处理最后一行
    if (
      endX > lineRect.left && //
      endX < lineRect.left + lineRect.width &&
      endY > charRect.top
    ) {
      collectText(text, charPos, pageItem, lineItem)
      return true
    }
  }
}

/**
 * 纵向收集字符，角度是0 、180
 */
const collectCharWithVertical = options => {
  const {
    pageItem,
    lineItem,
    collectText,
    angle = 0,
    directionX,
    directionY,
    startX,
    startY,
    endX,
    endY,
    isMatchFirstLine,
    lineRect,
    text,
    charPos,
    transformPos
  } = options
  const charRect = convertRectByPosition(transformPos(charPos))

  // 处理第一行
  if (isMatchFirstLine) {
    if (
      startX < charRect.left + charRect.width && //
      endX > charRect.left
    ) {
      collectText(text, charPos, pageItem, lineItem)
      return true
    }
    if (
      startX > charRect.left && //
      endX < charRect.left + charRect.width
    ) {
      collectText(text, charPos, pageItem, lineItem)
      return true
    }
    return true
  }

  if (directionY > 0) {
    // 处理超出第一行
    if (
      endY > lineRect.top + lineRect.height && //
      startX < charRect.left + charRect.width
    ) {
      collectText(text, charPos, pageItem, lineItem)
      return true
    }
    // 包含整行
    if (
      startY < lineRect.top && //
      endY > lineRect.top + lineRect.height
    ) {
      collectText(text, charPos, pageItem, lineItem)
      return true
    }
    // 处理最后一行
    if (
      endY > lineRect.top && //
      endY < lineRect.top + lineRect.height &&
      endX > charRect.left
    ) {
      collectText(text, charPos, pageItem, lineItem)
      return true
    }
  } else {
    // 处理超出第一行
    if (
      endY < lineRect.top && //
      startX > charRect.left
    ) {
      collectText(text, charPos, pageItem, lineItem)
      return true
    }
    // 包含整行
    if (
      startY > lineRect.top + lineRect.height && //
      endY < lineRect.top
    ) {
      collectText(text, charPos, pageItem, lineItem)
      return true
    }
    // 处理最后一行
    if (
      endY > lineRect.top && //
      endY < lineRect.top + lineRect.height &&
      endX < charRect.left + charRect.width
    ) {
      collectText(text, charPos, pageItem, lineItem)
      return true
    }
  }
}

/**
 * 匹配第一行
 */
const matchFirstLine = (
  angle: number,
  directionX: number,
  directionY: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  lineRect: RectStandardPosition
) => {
  if (isVerticalAngle(angle)) {
    if (
      startY > lineRect.top && //
      startY < lineRect.top + lineRect.height &&
      endY > lineRect.top &&
      endY < lineRect.top + lineRect.height
    ) {
      return true
    }
  } else if (isHorizontalAngle(angle)) {
    if (
      startX > lineRect.left && //
      startX < lineRect.left + lineRect.width &&
      endX > lineRect.left &&
      endX < lineRect.left + lineRect.width
    ) {
      return true
    }
  }
  return false
}

/**
 * 匹配在选中区域内的行
 */
const matchInScopeLine = (
  angle: number,
  directionX: number,
  directionY: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  lineRect: RectStandardPosition
) => {
  if (isVerticalAngle(angle)) {
    if (directionY > 0) {
      if (
        startY > lineRect.top + lineRect.height || //
        endY < lineRect.top
      ) {
        return false
      }
    } else {
      if (
        startY < lineRect.top || //
        endY > lineRect.top + lineRect.height
      ) {
        return false
      }
    }
  } else if (isHorizontalAngle(angle)) {
    if (directionX < 0) {
      if (
        startX < lineRect.left || //
        endX > lineRect.left + lineRect.width
      ) {
        return false
      }
    } else {
      if (
        startX > lineRect.left + lineRect.width || //
        endX < lineRect.left
      ) {
        return false
      }
    }
  }

  return true
}
/**
 * 纵向
 */
function isVerticalAngle(angle: number) {
  return [0, 180].includes(angle)
}

/**
 * 横向
 */
function isHorizontalAngle(angle: number) {
  return [90, 270].includes(angle)
}

/**
 * 获取光标
 */
function getCursorByAngle(angle: number) {
  return isHorizontalAngle(angle) ? 'vertical-text' : 'text'
}
