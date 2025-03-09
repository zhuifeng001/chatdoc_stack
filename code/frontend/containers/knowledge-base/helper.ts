import { DocumentResultContentType, type DocumentPageItem, type DocumentResultPage } from './types'
import FilePDFFilled from './images/FilePDFFilled.svg'
import FileDocumentFilled from './images/FileDocumentFilled.svg'
import FilePaperFilled from './images/FilePaperFilled.svg'
import FileFolderFilled from './images/FileFolderFilled.svg'
import { getKBDocumentImage, getKbDownloadImageUrl } from '@/api/knowledge-base'
import { blobToString, isEXCEL, isImage, isPDF, isTXT, isWORD } from '@/utils/file'
import { getBaseHeader } from '~/libs/request/interceptors/request/browser'

/**
 * 财经知识库 ID
 */
export const KB_FINANCIAL_ID = 1

export const getDocumentPageList = (
  pages: DocumentResultPage[] = [],
  options: { id: number; document_type: string }, // 文档id, 文档类型（系统、个人）
  type?: string
): DocumentPageItem[] => {
  if (!Array.isArray(pages)) return []

  const res: DocumentPageItem[] = []
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    page.num ??= i

    const text: any[] = []
    const areaIndexMap: number[] = []
    const areaTypeMap: string[] = []
    const lineIdMap: number[] = []
    const positionList: any[] = []
    if (Array.isArray(page.content)) {
      page.content.forEach(line => {
        if (line.type === DocumentResultContentType.LINE && line.text) {
          text.push(line.text)
          // areaTypeMap.push(...new Array(line.text.length).fill(line.type))
          if ('char_pos' in line && line.char_pos && line.char_pos.length > 0) {
            positionList.push(...line.char_pos)
          }
          // 兼容行坐标搜索
          else if ('pos' in line && line.pos && line.pos.length > 0) {
            for (let j = 0; j < line.text.length; j++) {
              lineIdMap.push(line.id)
              positionList.push(line.pos)
            }
          }
        }
      })
    }

    const image_id = page?.image_id || page.image?.image_id || ''
    const imageUrl = page?.image_url || page.image?.url || ''
    const filename = imageUrl.split('/').pop()
    const base64Prefix = 'data:image/jpeg;base64,'

    if ([90, 270].includes(page.angle)) {
      const temp = page.width
      page.width = page.height
      page.height = temp
    }

    const pageItem = {
      width: page.width,
      height: page.height,
      imageAngle: (360 + 360 - (page.angle || 0)) % 360, // 针对单页图片，获取的是原图
      url:
        getKbDownloadImageUrl() +
        `?id=${filename || options?.id}&image_id=${image_id}&document_type=${options.document_type}&type=imageList`,
      getUrlHeader: getBaseHeader,
      formatUrl(res: { data: string; type: string; headers: Record<string, string> }) {
        let src = res.data
        const contentType = res.headers?.['content-type'] || res.headers?.['Content-Type']
        if (contentType?.includes('text/plain') || contentType?.includes('application/gzip')) {
          src = base64Prefix + res.data
        }
        // 文档缩略图中使用
        pageItem._src = src
        return src
      },
      // 缩略图图片下载
      _getUrl: async function () {
        let src: string | Blob = ''
        const res = (await getKBDocumentImage(
          { id: filename || options?.id, image_id: image_id, document_type: options.document_type },
          { responseType: 'blob', decompress: true }
        )) as unknown as Blob
        // 图片返回的是 base64 文本
        if (res.type.includes('text/plain') || res.type.includes('application/gzip')) {
          src = base64Prefix + (await blobToString(res))
        } else {
          // 图片文件流
          src = res
        }
        return src
      },
      areas: page.structured || [], // 定位用
      lines: page.content || [], // 搜索，图像切边展示用
      mark_list: [],
      index: page.num + 1,
      rate: 1,
      // text: text.join('\n'),
      // 搜索用 ------ start
      textList: text.join(''),
      areaIndexMap,
      lineIdMap,
      areaTypeMap,
      positionList
      // 搜索用 ------ end
    } as any
    res.push(pageItem)
  }
  return res
}

export const getFileIcon = (type: 'kb' | 'folder' | 'file', filename = '') => {
  switch (type) {
    case 'kb':
      return FilePaperFilled
    case 'folder':
      return FileFolderFilled
    case 'file':
    default:
      if (isPDF(filename)) {
        return FilePDFFilled
      } else if (isImage(filename) || isTXT(filename) || isEXCEL(filename) || isWORD(filename)) {
        return FileDocumentFilled
      } else {
        return FileDocumentFilled
      }
  }
}

const findLastChild = (parent: any, deep = Infinity): any => {
  if (!parent || !parent.children || !parent.children.length || deep <= 0) return parent
  return findLastChild(parent.children[parent.children.length - 1], deep - 1)
}

export const genTableContentTreeList = (list: any[]) => {
  const res: any[] = []
  let prev = 1
  let prevElement: any = null
  let prevElementChildren: any[] | null = null
  for (let i = 0; i < list.length; i++) {
    const element = list[i]
    element._index = i + 1

    if (element.level === 1) {
      prevElementChildren = null
      prev = 1
    }
    if (element.level > prev) {
      prevElement = findLastChild(res[res.length - 1])
    } else if (element.level < prev) {
      prevElement = findLastChild(res[res.length - 1], element.level - 2)
    }

    if (prevElement) {
      if (!prevElement.children) {
        prevElement.children = []
      }
      prevElementChildren = prevElement.children
      prevElementChildren?.push(element)
      prev = element.level
      prevElement = null
      continue
    }

    if (prevElementChildren) {
      prevElementChildren.push(element)
    } else {
      res.push(element)
    }
  }
  return res
}
