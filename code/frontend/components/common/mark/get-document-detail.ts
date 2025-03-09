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
  console.log('pages :>> ', pages)
  return pages
}
