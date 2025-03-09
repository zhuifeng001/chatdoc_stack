import type { jsPDF as JSPDF } from 'jspdf'

const getFont = () => {
  // @ts-ignore
  return import('@/assets/fonts/SourceHanSansCN-Normal.js').then(res => {
    return res.default
  })
}

const A4 = {
  type: 'portrait',
  width: 595.28,
  height: 841.89
}

const PX_TO_PT = 0.75
const PT_TO_PX = 1 / PX_TO_PT

const FONT_SIZE_PX = 14 // px
const FONT_SIZE_TITLE_PX = 20 // px

const FONT_SIZE_PT = FONT_SIZE_PX * PX_TO_PT // pt
const FONT_FAMILY = 'hansans' // 思源黑体

const initPerPage = (doc: JSPDF) => {
  doc.setFont(FONT_FAMILY)
  doc.setFontSize(FONT_SIZE_PX)
  doc.setTextColor('rgb(0, 0, 0)')
}

const initDoc = async (doc: JSPDF) => {
  const SourceHanSansCNNormal = await getFont()
  // @ts-ignore
  doc.addFileToVFS('SourceHanSansCN-Normal.ttf', SourceHanSansCNNormal)
  doc.addFont('SourceHanSansCN-Normal.ttf', FONT_FAMILY, 'normal')
  initPerPage(doc)
}

export type ExportPDFOptions = {
  x?: number
  y?: number
  margin?: number | number[]
  type?: 'blob' | 'download'
  filename?: string
}

export const exportPDF = async (dom: HTMLElement, options?: ExportPDFOptions): Promise<JSPDF | Blob> => {
  const { type = 'download', filename } = options || {}
  const jsPDF = (await import('jspdf')).default
  const doc = new jsPDF({ orientation: A4.type as any, unit: 'pt' })
  await initDoc(doc)

  // 需设置字体样式
  const originFontFamily = getComputedStyle(dom).fontFamily
  dom.style.fontFamily = 'hansans'

  return new Promise(resolve => {
    doc.html(dom, {
      callback: function (doc) {
        dom.style.fontFamily = originFontFamily
        if (type === 'blob') {
          const b1 = doc.output('blob')
          resolve(b1)
        } else if (type === 'download') {
          doc.save(filename)
        }
        resolve(doc)
      },
      html2canvas: {
        scale: 0.75
      },
      margin: options?.margin || 0,
      autoPaging: 'text', // true / false / text
      x: options?.x || 0,
      y: options?.y || 0,
      width: A4.width / 0.75,
      windowWidth: A4.width / 0.75
    })
  })
}
