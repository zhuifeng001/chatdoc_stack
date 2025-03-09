import copy from 'copy-to-clipboard'
import { dataStructuredIndex, getAttrStructuredIndex } from './util'
import { message } from 'ant-design-vue'
import { marked } from 'marked'
import { CustomCopyPlugin, ShapeSelector } from './useCustomCopyPlugin'
import type { MarkInstance, MarkOptions } from '@intsig/canvas-mark'
import { createMarkShape } from './helper'

const StructuredClassName = 'structured-item'
const defaultStyle = {
  strokeStyle: 'transparent',
  fillStyle: 'transparent' //
}

const activeStyle = {
  strokeStyle: 'transparent',
  fillStyle: 'rgba(72, 119, 255, 0.2)' // 'rgba(255, 0, 255, 0.3)'
}

// 假设原始类型定义如下
type StructuredItem =
  | { type: 'image'; content: string; base64: string }
  | { type: 'paragraph'; content: string }
  | { type: 'table'; content: string; html: string }

export const useDocumentStructured = ({
  markInstance,
  markOptions
}: {
  markInstance: MarkInstance
  markOptions: MarkOptions
}) => {
  const getPageIndex = markInstance.getPageIndex()
  const getPages = () => markOptions.pages || []

  const getDocMergeMap = () => markOptions.data?.docMergeMap
  const currentCopyCollection = ref<any>(null)

  const preCreateMarkByPage = (page_index: number) => {
    const page = getPages().find(v => v.index === page_index)
    const structured = page?.areas || []
    structured.forEach((line, index) => {
      line && createLineMark(page_index, line, index)
    })
  }

  // 预加载框
  const preCreateStructuredMark = (page_index: number) => {
    if (page_index == null) return
    preCreateMarkByPage(page_index)

    const preloadNum = 2 // 预加载前后两页的框

    const preload = () => {
      const len = getPages().length
      const start = Math.max(1, page_index - preloadNum)
      const end = Math.min(len, page_index + preloadNum)
      let i = page_index
      let j = page_index
      while (i >= start || j <= end) {
        i--
        j++
        i > 0 && preCreateMarkByPage(i)
        j <= len && preCreateMarkByPage(j)
      }
    }
    preload()
  }

  const createLineMark = (page_index: number, line, index: number) => {
    if (line._structured_rendered) return
    line._structured_rendered = true
    const ori_id = `${page_index - 1},${index}`

    const { pos, text } = line
    // 'image'
    // if (['footer', 'header'].includes(line.type)) return

    createMarkShape(markInstance, {
      page: page_index,
      position: pos, // pos.length === 8 ? [pos[6], pos[7], pos[2], pos[3]] :
      attrs: {
        title: '边框',
        [dataStructuredIndex]: ori_id // ori_id
      },
      classNames: [StructuredClassName],
      canvasStyleOptions: defaultStyle
    })
  }

  const clearMarkItem = () => {
    markInstance?.removeShape({ selector: '.' + StructuredClassName })
    // markInstance?.render()
  }

  const currentOriId = ref<string>('')

  const getOriIdByShape = shape => {
    let ori_id = ''
    for (const attr of shape.options.selector) {
      if (attr.match(/^\[data-structured-index="(.*)"\]/)) {
        ori_id = attr.match(/^\[data-structured-index="(.*)"\]/)?.[1] || ''
      }
    }
    return ori_id
  }

  const getNearbyShapes = (shape, ori_id) => {
    const res: any[] = []
    const ori_id_item = getDocMergeMap()?.[ori_id]
    if (ori_id_item?.ori_id?.length) {
      for (const ori_id of ori_id_item.ori_id) {
        const shapes = markInstance?.queryAllState(getAttrStructuredIndex(ori_id)) as any[]
        if (shapes?.length) {
          res.push(...shapes)
        }
      }
    }
    return res
  }

  const hiddenCopyDom = () => {
    const copyDom = document.getElementById('CopyMarkText') as HTMLElement
    if (!copyDom) return
    copyDom.style.display = 'none'
    currentOriId.value = ''
    currentCopyCollection.value = null
  }

  const isDraggingCopy = () => {
    const doing = markInstance?.plugins?.['CopyTextPlugin']?.isDrag()
    return doing
  }
  const hasMarkCopy = () => {
    const doing = markInstance?.plugins?.['CopyTextPlugin']?.hasMark()
    return doing
  }

  const activateMarkShape = shape => {
    if (!shape.options.selector.includes(`.${StructuredClassName}`)) return

    const currentShapeOriId = getOriIdByShape(shape)

    // 获取跨页框
    const shapes = getNearbyShapes(shape, currentShapeOriId)
    if (shapes?.length) {
      for (const shape of shapes) {
        shape.updateOptions(activeStyle)
        shape.setState({ visible: true })
      }
    }
    shape.updateOptions(activeStyle)
    markInstance?.render()
  }

  const deactivateMarkShape = shape => {
    if (!shape.options.selector.includes(`.${StructuredClassName}`)) return

    const currentShapeOriId = getOriIdByShape(shape)

    // 获取跨页框
    const shapes = getNearbyShapes(shape, currentShapeOriId)
    if (shapes?.length) {
      for (const nearShape of shapes) {
        nearShape.updateOptions(defaultStyle)
        shape.setState({ visible: false })
      }
    }
    shape.updateOptions(defaultStyle)
    markInstance?.render()
  }

  let isHovering = false

  const hover = shape => {
    if (isHovering) return
    if (!shape.options.selector.includes(`.${StructuredClassName}`)) return

    if (hasMarkCopy()) {
      if (isDraggingCopy()) {
        deactivateMarkShape(shape)
        hiddenCopyDom()
      }
      return
    }

    isHovering = true

    currentOriId.value = getOriIdByShape(shape)

    activateMarkShape(shape)

    const points = markInstance?.transformActualPoint([
      shape.options.left,
      shape.options.top,
      shape.options.left + shape.options.width,
      shape.options.top + shape.options.height
    ])

    const copyDom = document.getElementById('CopyMarkText') as HTMLElement
    const canvasDom = document.querySelector('.mark-container canvas') as HTMLElement
    const canvasRect = canvasDom.getBoundingClientRect()
    copyDom.style.left = canvasRect.left + Math.max(points[0], 0) + 'px'
    copyDom.style.top = canvasRect.top + Math.max(points[1], 0) - 48 + 'px'
    // copyDom.style.minWidth = Math.max(points[2], 0) - Math.max(points[0], 0) + 'px'
    copyDom.style.display = 'block'
  }

  const leave = shape => {
    if (isDraggingCopy() || hasMarkCopy()) return
    if (shape.state.visible && shape.options.selector.includes(`.${StructuredClassName}`)) {
      deactivateMarkShape(shape)
      hiddenCopyDom()
      isHovering = false
    }
  }

  function cropImage({ x, y, width, height }) {
    const originalCanvas = markInstance!.getCanvas()
    x = x * devicePixelRatio
    y = y * devicePixelRatio
    width = width * devicePixelRatio
    height = height * devicePixelRatio

    // 处理图片比canvas高的情况
    const originCanvasHeight = originalCanvas.height
    const totalY = y >= 0 ? height + y : height - y
    const overHeight = totalY > originCanvasHeight || y < 0
    const originPointY = y
    if (overHeight) {
      originalCanvas.height = height * devicePixelRatio
      originalCanvas.style.height = height + 'px'
      const [tx, ty] = markInstance.getTranslate()
      markInstance.updateTranslate([tx, ty - y])
      y = 0
      markInstance.render()
    }

    const originCanvasCtx = originalCanvas.getContext('2d', { willReadFrequently: true })
    if (!originCanvasCtx) return ''
    const imageData = originCanvasCtx.getImageData(x, y, width, height)

    // 返回原来的y
    if (overHeight) {
      originalCanvas.height = originCanvasHeight
      originalCanvas.style.height = originCanvasHeight / devicePixelRatio + 'px'
      const [tx, ty] = markInstance.getTranslate()
      markInstance.updateTranslate([tx, ty + originPointY])
    }

    // 创建一个新的Canvas来存放裁剪后的图片
    var croppedCanvas = document.createElement('canvas')
    var croppedCtx = croppedCanvas.getContext('2d')
    if (!croppedCtx) return ''
    // 设置新Canvas的尺寸
    croppedCanvas.width = width
    croppedCanvas.height = height

    // 使用drawImage方法裁剪图片
    croppedCtx.putImageData(imageData, 0, 0)

    // 将裁剪后的Canvas内容转换为图片数据
    return croppedCanvas.toDataURL('image/png')
  }

  const getImageSrc = (ori_id: string) => {
    if (!markInstance) return ''
    const shape = markInstance.queryState(getAttrStructuredIndex(ori_id))
    if (!shape) return ''
    const [x, y, x2, y2] = markInstance.transformActualPoint([
      shape.options.left,
      shape.options.top,
      shape.options.left + shape.options.width,
      shape.options.top + shape.options.height
    ])
    deactivateMarkShape(shape)
    const src = cropImage({
      x: x,
      y: y,
      width: x2 - x,
      height: y2 - y
    })
    activateMarkShape(shape)
    return src
  }

  const findTextByOriId = (ori_id: string): StructuredItem | undefined => {
    if (!ori_id) return
    const ori_id_item = getDocMergeMap()?.[ori_id]
    if (ori_id_item) {
      if (ori_id_item.type === 'table') {
        return { type: ori_id_item.type, content: ori_id_item.content, html: ori_id_item.html }
      }
      return { type: 'paragraph', content: ori_id_item.content }
    }
    const [page, index] = ori_id.split(',')
    const currentPageItem = getPages().find(v => v.index === +page + 1)
    const pageStructured = currentPageItem?.areas?.[+index]
    if (!pageStructured) return

    // 新版直接返回段落的文本
    if (pageStructured.type === 'paragraph' && pageStructured.text) {
      return { type: 'paragraph', content: pageStructured.text }
    }

    const content = pageStructured.content
    const blocks = pageStructured.blocks

    if (pageStructured.type === 'image') {
      // 裁剪图片
      return { type: 'image', content: getContent(currentPageItem, content), base64: getImageSrc(ori_id) }
    }

    if (typeof content === 'number') {
      return { type: 'paragraph', content: getContent(currentPageItem, content) }
    } else if (Array.isArray(content)) {
      if (typeof content[0] === 'number') {
        let text = ''
        for (const contentId of content) {
          text += getContent(currentPageItem, contentId)
        }
        return { type: 'paragraph', content: text }
      } else if (typeof content[0] === 'object') {
        let text = ''
        for (const c of content) {
          text += getContent(currentPageItem, c.content)
        }
        return { type: 'paragraph', content: text }
      }
    } else if (Array.isArray(blocks)) {
      let text = ''
      for (const c of blocks) {
        text += getContent(currentPageItem, c.content)
      }
      return { type: 'paragraph', content: text }
    }
  }

  const getContent = (pageItem, contentId: number | number[]) => {
    let text = ''
    if (contentId == null) {
      return text
    } else if (typeof contentId === 'number') {
      text += pageItem.lines.find(o => o.id === contentId)?.text || ''
    } else if (Array.isArray(contentId)) {
      for (const id of contentId) {
        text += pageItem.lines.find(o => o.id === id)?.text || ''
      }
    }
    return text
  }

  const getCurrentStructuredText = () => {
    if (currentCopyCollection.value) {
      return collectText()
    }
    if (currentOriId.value) {
      return findTextByOriId(currentOriId.value)
    }
  }

  const collectText = () => {
    let text = ''
    let html = ''
    let type = 'paragraph'
    const table_ori_id_set = new Set()
    const paragraph_ori_id_set = new Set()
    for (const [page, values] of currentCopyCollection.value) {
      for (const item of values) {
        const ori_id = `${page - 1},${item.areaIndex}`
        if (table_ori_id_set.has(ori_id)) continue

        const ori_id_item = getDocMergeMap()?.[ori_id]
        if (ori_id_item?.type === 'table') {
          text += '\n' + ori_id_item.content
          html += '<br/>' + ori_id_item.html
          type = 'table'
          table_ori_id_set.add(ori_id)
        } else {
          text += (paragraph_ori_id_set.has(ori_id) ? '' : '\n') + item.text
          html += (paragraph_ori_id_set.has(ori_id) ? '' : '<br/>') + item.text
          if (!paragraph_ori_id_set.has(ori_id)) {
            paragraph_ori_id_set.add(ori_id)
          }
        }
      }
    }

    if (text.startsWith('\n')) {
      // 去除 \n
      text = text.slice(1)
    }
    if (html.startsWith('<br/>')) {
      // 去除开始的 <br/>
      html = html.slice(5)
    }
    return { type: type, content: text, html: html }
  }

  const copyTextWithFormat = async (content?: string, html?: string) => {
    // await navigator.clipboard.writeText(item.content)
    const clipboardItemsConfig = {}
    if (content) {
      clipboardItemsConfig['text/plain'] = new Blob([content], { type: 'text/plain' })
    }
    if (html) {
      clipboardItemsConfig['text/html'] = new Blob([html], { type: 'text/html' })
    }
    if (!Object.keys(clipboardItemsConfig).length) return

    await navigator.clipboard.write([new ClipboardItem(clipboardItemsConfig)])
  }

  const copyImageWithFormat = async (content?: string, base64?: string, mineType = 'image/png') => {
    const clipboardItemsConfig = {}
    if (content) {
      clipboardItemsConfig['text/plain'] = new Blob([content], { type: 'text/plain' })
    }
    if (base64) {
      clipboardItemsConfig[mineType] = dataURItoBlob(base64)
    }
    if (!Object.keys(clipboardItemsConfig).length) return

    await navigator.clipboard.write([new ClipboardItem(clipboardItemsConfig)])
  }

  /**
   * 点击复制版面
   */
  const onCopy = async (e?: any) => {
    e?.stopPropagation()

    if (currentCopyCollection.value) {
      const item = getCurrentStructuredText()
      if (item?.content) {
        // @ts-ignore
        await copyTextWithFormat(item.content, item.html)
        track({ name: `文档内容复制`, keyword: item.content, type: '框选', page: '问答页' })
        hiddenCopyDom()
        message.success('已复制')
      }
    } else {
      const item = getCurrentStructuredText()
      if (!item) return

      if (item.type === 'table') {
        const html = item.html ? item.html : await marked.parse(item.content)
        await copyTextWithFormat(item.content, html)
      } else if (item.type === 'image') {
        // @ts-ignore
        copyImageWithFormat(item.content, item.base64)
      } else {
        copy(item?.content)
      }
      track({ name: `文档内容复制`, keyword: item.content, type: '直接', page: '问答页' })
      hiddenCopyDom()
      message.success('已复制')
    }
  }

  /**
   * 框选复制
   */
  const onCopySelected = async (e, pageLineCollection: Map<number, any>) => {
    if (e == null) {
      // Ctrl + C
      onCopy()
      return
    }

    await delay(0)
    if (!pageLineCollection?.size) return
    currentCopyCollection.value = pageLineCollection

    const copyDom = document.getElementById('CopyMarkText') as HTMLElement

    copyDom.style.left = e.x - 16 + 'px'
    copyDom.style.top = e.y - 16 + 'px'
    copyDom.style.display = 'block'
  }

  const getText = async (e?: any) => {
    e?.stopPropagation()

    if (currentCopyCollection.value) {
      const item = getCurrentStructuredText()
      return {
        text: item?.content || '',
        // @ts-ignore
        html: (item?.html as string) || ''
      }
    } else {
      const item = getCurrentStructuredText()

      if (item?.type === 'table') {
        const html = item.html ? item.html : await marked.parse(item.content)
        return {
          text: item.content,
          html: html
        }
      } else if (item?.type === 'image') {
        // copyImageWithFormat(item.content, item.base64)
        return {
          text: '',
          html: '',
          // @ts-ignore
          base64: item.base64
        }
      } else {
        return {
          text: item?.content || '',
          html: ''
        }
      }
    }
  }

  const setDefaultMarkItem = () => {
    const shapes = markInstance?.queryAllState(`.${StructuredClassName}`)
    if (shapes?.length) {
      for (const shape of shapes) {
        shape.updateOptions(defaultStyle)
      }
    }
    markInstance.render()
  }

  const onClear = () => {
    if (isDraggingCopy()) return
    hiddenCopyDom()
    setDefaultMarkItem()
  }

  const onMarkHover = ([shape, e]: any) => {
    hover(shape)
  }
  const onMarkLeave = ([shape, e]: any) => {
    leave(shape)
  }

  const onChangePage = ([pageIndex, pageItem]: any) => {
    preCreateStructuredMark(pageIndex)
  }

  const onUpdatePages = e => {
    init()
  }

  const resetRenderState = () => {
    getPages().forEach((page, i) => {
      const page_index = page.index ?? i + 1
      const structured = page?.areas || []
      structured.forEach((line, index) => {
        line._structured_rendered = false
      })
    })
  }
  const init = () => {
    resetRenderState()
    destroy()
    document.body.addEventListener('click', onClear)
    markInstance.on('markHover', onMarkHover)
    markInstance.on('markLeave', onMarkLeave)
    markInstance.on('changePage', onChangePage)
    markInstance.on('update', onUpdatePages)
    preCreateStructuredMark(1)
  }

  const destroy = () => {
    clearMarkItem()
    hiddenCopyDom()
    document.body.removeEventListener('click', onClear)
    markInstance.off('markHover', onMarkHover)
    markInstance.off('markLeave', onMarkLeave)
    markInstance.off('changePage', onChangePage)
  }

  return {
    name: useDocumentStructured.name,
    init,
    destroy,
    hover,
    leave,
    onClear,
    onCopy,
    onCopySelected,
    getText
  }
}
