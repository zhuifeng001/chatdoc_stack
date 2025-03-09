import { getKBDocumentBrief, getKBDocumentCatalog, getKBDocumentDetail, getKBDocumentMergeData } from '@/api'
import type { DocumentPageItem } from '~/containers/knowledge-base/types'
import { genTableContentTreeList, getDocumentPageList } from '~/containers/knowledge-base/helper'
import { omit } from 'lodash-es'

export const useDocumentStore = () => {
  const KBDocumentRef = ref()
  const documentLoading = ref(true)
  const catalogLoading = ref(true)
  const thumbnailLoading = ref(true)
  const docMergeMap = shallowRef<any>({})
  const pageList = shallowRef<any[]>([])
  const documentTableContent = shallowRef<any[]>([])
  const thumbnailList = shallowRef<any[]>([])
  const highlightThumbnailPages = shallowRef<any[]>([])

  const getPageMarkRef = () => {
    return KBDocumentRef.value?.PageMarkRef
  }

  const updateMark = (pages?) => {
    getPageMarkRef().update(pages)
  }

  const getPageMarkInstance = () => {
    return getPageMarkRef()?.getMarkInstance()
  }

  const setMarkMergeData = () => {
    const markInstance = getPageMarkInstance()
    if (markInstance) {
      markInstance.options.data ??= {}
      markInstance.options.data.docMergeMap = docMergeMap.value
    }
  }

  type BriefOPtions =
    | 'load' // 加载brief，直接渲染，提高图片加载速度
    | 'merge' // 请求brief，不直接渲染，合并doc_parser后渲染
    | 'none' // 不请求brief

  type DocumentDetailOptions = {
    brief?: BriefOPtions
    wait?: 'all'
  }
  const mergeBriefData = (newList, oldList) => {
    if (newList.length !== oldList.length) return []
    for (let i = 0; i < oldList.length; i++) {
      const item = omit(newList[i], oldList[i])
      Object.assign(oldList[i], item)
    }
    return oldList
  }

  const mergeBriefPages = (newList: DocumentPageItem[], oldList: DocumentPageItem[]) => {
    if (newList.length !== oldList.length) return []
    for (let i = 0; i < oldList.length; i++) {
      /**
       * 1. 不能覆盖 url getUrl 文档组件会失去缓存
       * 2. formatUrl 中有赋值 _src 字段，用来展示缩略图，利用文档组件中的缓存
       */
      const item = omit(newList[i], ['getUrl', 'url', 'formatUrl']) // 排除getUrl
      Object.assign(oldList[i], item)
    }
    return oldList
  }

  const getDocumentDetail = async (params, { brief, wait }: DocumentDetailOptions = { brief: 'load' }) => {
    initPage()

    let start_time = +new Date()
    let brief_time = +new Date()

    let briefPages: DocumentPageItem[] = []
    let briefData: any[] = []
    const p1 =
      brief === 'none'
        ? Promise.resolve()
        : getKBDocumentBrief(params)
            .then((data: any) => {
              briefData = data.pics
              const list = getDocumentPageList(data.pics, params)
              if (brief === 'load') {
                pageList.value = list
                documentLoading.value = false
                thumbnailLoading.value = false
              } else if (brief === 'merge') {
                briefPages = list
              }
              thumbnailList.value = list.map(o => () => o._src || o._getUrl)
              brief_time = +new Date()
            })
            .catch(e => {
              console.log('brief e :>> ', e)
            })

    const p3 = getKBDocumentCatalog(params)
      .then((r: any) => {
        return useIdlePromise(() => {
          const tableContent = genTableContentTreeList(r.generate)
          documentTableContent.value = tableContent
        })
      })
      .catch(e => {
        console.log('catalog e', e)
      })
      .finally(() => {
        catalogLoading.value = false
      })

    const p7 = getKBDocumentDetail(params)
      .then(async (res: any) => {
        if (brief !== 'none') {
          await p1
        }
        // console.log('res docparser:>> ', res)
        let pages =
          (res?.result?.engine === 'pdf2md'
            ? transformPages(res.result)
            : res.pages || res.result?.pages || res.result) || []

        if (brief !== 'none') {
          pages = mergeBriefData(pages, briefData)
        }

        const list: any[] = getDocumentPageList(pages, params)

        if (!thumbnailList.value?.length) {
          thumbnailList.value = list.map(o => () => o._src || o._getUrl)
        }

        if (brief === 'merge') {
          pageList.value = mergeBriefPages(list, briefPages as DocumentPageItem[])
        } else if (!pageList.value?.length) {
          pageList.value = list
          // 重新渲染
          updateMark(pageList.value)
        }
        // 保留引用，更新数据
        else {
          const newPages = mergeBriefPages(list, pageList.value)
          // 重新渲染
          updateMark(newPages)
        }

        console.log('loaded', brief_time - start_time, +new Date() - start_time)
      })
      .catch(e => {
        console.log('docparser e :>> ', e)
      })
      .finally(() => {
        documentLoading.value = false
        thumbnailLoading.value = false
      })

    const p2 = useIdlePromise(async () => {
      await getKBDocumentMergeData(params)
        .then((data: any) => {
          if (data?.length) {
            docMergeMap.value = {}
            for (const item of data) {
              if (item.ori_id?.length) {
                for (const ori_id of item.ori_id) {
                  docMergeMap.value[ori_id] = item
                }
              }
            }
          }
        })
        .catch(e => {
          console.log('merge e', e)
        })

      await p7
      setMarkMergeData()
    })

    if (brief === 'merge' || brief === 'none') {
      return p7
    }

    if (wait) {
      return Promise.all([p1, p2, p7])
    }

    return Promise.all([p1, p2]).catch(() => {
      return p7
    })
  }

  const initPage = () => {
    documentLoading.value = true
    thumbnailLoading.value = true
    catalogLoading.value = true
    pageList.value = []
    thumbnailList.value = []
    documentTableContent.value = []
    docMergeMap.value = {}
  }

  return {
    KBDocumentRef,
    documentLoading,
    catalogLoading,
    thumbnailLoading,
    docMergeMap,
    pageList,
    documentTableContent,
    thumbnailList,
    highlightThumbnailPages,
    getDocumentDetail,
    getPageMarkRef,
    getPageMarkInstance,
    setMarkMergeData,
    updateMark,
    initPage
  }
}

// 详见 textin 文档解析文档
type PageDetail = {
  type: string
  outline_level: number
  page_id: number // start 1
  paragraph_id: number // start 1
  position: number[]
  text: string
  tags: any[]
  content: 0 | 1
}

type PageMetrics = {
  angle: number
  dip: number
  image_id: string
  page_id: number
  page_image_width: number
  page_image_height: number
}

type PageData = {
  angle: number
  page_id: number
  content: any[]
  structured: StructureItem[]
  width: number
  height: number
}

type StructureItem = {
  pos: number[]
  blocks?: any[]
  content?: number | number[]
  type: string
  // 自定义新增
  text: string
  id: number
}

type PDF2MDData = {
  detail: PageDetail[]
  metrics: PageMetrics[]
  pages: PageData[]
}

export const transformPages = (data: PDF2MDData): PageData[] | undefined => {
  const _pages: PageData[] = data.pages
  const details: PageDetail[] = data.detail
  const metrics: PageMetrics[] = data.metrics
  if (!details) return
  // 分组
  const pages: PageData[] = []
  for (const d of details) {
    const page_index = d.page_id - 1
    const page = pages[page_index]
    const metricItem = metrics[page_index]
    const structuredItem = {
      pos: d.position,
      type: d.type,
      text: d.text,
      id: d.paragraph_id
    }
    if (!page) {
      const structured: StructureItem[] = []
      structured[d.paragraph_id] = structuredItem
      const item: PageData = {
        angle: metricItem.angle,
        page_id: d.page_id,
        width: metricItem.page_image_width,
        height: metricItem.page_image_height,
        content: _pages[page_index].content,
        structured
      }
      pages.push(item)
    } else {
      page.structured[d.paragraph_id] = structuredItem
    }
  }
  return pages
}
