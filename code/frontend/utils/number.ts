import BigNumber from 'bignumber.js'

export const formatDataSize = (size: number) => {
  if (size <= 0) return size
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let num = new BigNumber(size)
  while (num.gte(1024) && i < units.length - 1) {
    num = num.dividedBy(1024)
    i++
  }
  return `${num.toFixed(1)} ${units[i]}`
}
