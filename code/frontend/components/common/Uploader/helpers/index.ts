import { message } from 'ant-design-vue'

/**
 *
 * @param file
 * @param size 单位MB
 * @returns
 */
export const checkFileSize = (file: File, size: number) => {
  const fileSize = file.size
  const fileM = fileSize / 1024 / 1024
  if (fileM >= size) {
    message.error(`单个文件需小于${size}MB`)
    return false
  }
  return true
}
