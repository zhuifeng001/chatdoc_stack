export const imageExtArray = [
  '.jpg',
  '.jpeg',
  '.png',
  '.JPG',
  '.JPEG',
  '.PNG'
  // '.bmp',
  // '.BMP',
  // '.tif',
  // '.tiff',
  // '.TIF',
  // '.TIFF'
]

export const docExtArray = ['.doc', '.docx', '.DOC', '.DOCX']
// export const docExtArray = ['.doc', '.docx', '.wps', '.DOC', '.DOCX', '.WPS', '.txt', '.TXT']

export const excelExtArray = ['.xls', '.xlsx']

export const isImage = (filename: string) => {
  return /.(jpg|jpeg|png|bmp|BMP|JPG|JPEG|PNG|tif|tiff|TIF|TIFF)$/.test(filename)
}
export const isPDF = (filename: string) => {
  return /.(pdf|PDF)$/.test(filename)
}
export const isWORD = (filename: string) => {
  return /.(doc|DOC|docx|DOCX|wps|WPS)$/.test(filename)
}
export const isEXCEL = (filename: string) => {
  return /.(xlsx|XLSX|xls|XLS)$/.test(filename)
}
export const isTXT = (filename: string) => {
  return /.(txt|TXT)$/.test(filename)
}

export const isTiffByMineType = (fileType: string) => {
  return fileType.indexOf('tif') > -1
}

export const convertTiffToPNG = async (file: File | Blob) => {
  const base64 = await parseTiffToBase64(file)
  return base64ToBlob(base64, 'image/png')
}

export enum FileTypeEnums {
  IMAGE = 'image',
  PDF = 'pdf',
  WORD = 'word',
  EXCEL = 'excel',
  TXT = 'txt'
}

export const getFileTypeByName = (filename: string) => {
  if (isImage(filename)) {
    return FileTypeEnums.IMAGE
  } else if (isPDF(filename)) {
    return FileTypeEnums.PDF
  } else if (isWORD(filename)) {
    return FileTypeEnums.WORD
  } else if (isEXCEL(filename)) {
    return FileTypeEnums.EXCEL
  } else if (isTXT(filename)) {
    return FileTypeEnums.TXT
  }
  return FileTypeEnums.TXT
}

/**
 * 获取文件扩展名
 * @param filename
 * @returns
 */
export const getFileExtension = (filename = '') => {
  return filename?.split?.('.')?.pop()?.toLocaleLowerCase() || ''
}
export const getFileExtensionWithDot = (filename = '') => {
  const extension = getFileExtension(filename)
  return extension ? `.${extension}` : extension
}
export const getFileNameWithoutExtension = (filename = '') => {
  return filename?.split?.('.')?.shift() || ''
}

export const parseTiffToBase64 = (file: File | Blob): Promise<string> => {
  const reader = new FileReader()
  reader.readAsArrayBuffer(file)
  return new Promise(resolve => {
    reader.onload = (eve: any) => {
      import('tiff.js').then(res => {
        const Tiff = res.default
        globalThis.Tiff ??= Tiff
        globalThis.Tiff.initialize({ TOTAL_MEMORY: 200000000 })
        const image = new globalThis.Tiff({ buffer: eve.target.result })
        resolve(image.toDataURL())
      })
    }
  })
}

export const parseFileToBase64 = (imgFile: File | Blob): Promise<string> => {
  const reader = new FileReader()
  reader.readAsDataURL(imgFile)
  return new Promise(resolve => {
    reader.onload = (eve: any) => {
      resolve(eve.target.result)
    }
  })
}

export const parseFileToBase64Content = async (imgFile: File | Blob): Promise<string> => {
  const base64 = await parseFileToBase64(imgFile)
  return base64?.split?.(',')?.[1]
}

/**
 * base64  to blob二进制
 */
export function dataURItoBlob(dataURI: string): Blob {
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0] // mime类型
  const byteString = atob(dataURI.split(',')[1]) // base64 解码
  const arrayBuffer = new ArrayBuffer(byteString.length) // 创建缓冲数组
  const intArray = new Uint8Array(arrayBuffer) // 创建视图

  for (let i = 0; i < byteString.length; i++) {
    intArray[i] = byteString.charCodeAt(i)
  }
  return new Blob([intArray], { type: mimeString })
}

/**
 *
 * blob二进制 to base64
 **/
export function blobToDataURI(blob): Promise<string> {
  const reader = new FileReader()
  return new Promise(resolve => {
    reader.onload = function (e) {
      resolve(e.target?.result as string)
    }
    reader.readAsDataURL(blob)
  })
}

export const openDownload = (url: Blob, filename: string) => {
  if ((window.navigator as any).msSaveOrOpenBlob) {
    // 兼容ie11不能导出json
    ;(window.navigator as any).msSaveOrOpenBlob(url, filename)
  } else {
    // 其他浏览器下载差异报告
    openDownloadDialog(url, filename)
  }
}

function openDownloadDialog(url: Blob | string, filename: string) {
  if (typeof url !== 'string' && url instanceof Blob) {
    url = URL.createObjectURL(url) // 创建blob地址
  }
  const aLink = document.createElement('a')
  aLink.href = url as string
  aLink.download = filename || '' // HTML5新增的属性，指定保存文件名，可以不要后缀，注意，file:///模式下不会生效
  let event
  if (window.MouseEvent) {
    event = new MouseEvent('click')
  } else {
    event = document.createEvent('MouseEvents')
    event.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
  }
  aLink.dispatchEvent(event)
}

export const trimDataToURL = (data: string) => data.replace(/^data:.*?;base64,/, '')

export const getMimetype = (base64: string) => {
  return base64.match(/^data:(.*);base64,/)?.[1]
}

const base64ToBuffer = (base64: string) => {
  const binary = atob(trimDataToURL(base64))
  const { length } = binary
  const buffer = new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    buffer[i] = binary.charCodeAt(i) & 0xff
  }
  return buffer
}

export const base64ToBlob = (base64: any, type = 'application/octet-stream') => {
  return new Blob([base64ToBuffer(base64)], {
    type
  })
}

// blob转 string
export const blobToString = (blob: Blob) => {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = function () {
      resolve(this.result)
    }
    reader.readAsText(blob)
  })
}
