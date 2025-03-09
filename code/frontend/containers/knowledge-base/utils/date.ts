import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/zh-cn'
dayjs.locale('zh-cn')
import relativeTime from 'dayjs/plugin/relativeTime'
// import utc from 'dayjs/plugin/utc'
// dayjs.extend(utc)
dayjs.extend(relativeTime)

import isToday from 'dayjs/plugin/isToday'
import isYesterday from 'dayjs/plugin/isYesterday'

dayjs.extend(isToday)
dayjs.extend(isYesterday)

/**
 * @description 判断是否是今天
 */
export const isTodayDate = date => {
  return dayjs(date).isToday()
}

/**
 * @description 判断是否是昨天
 */
export const isYesterdayDate = date => {
  return dayjs(date).isYesterday()
}

/**
 * @description 判断是否是前天
 */
export const isBeforeYesterdayDate = date => {
  return dayjs(date).isSame(dayjs().subtract(2, 'day').startOf('day'))
}

export const formatTodayAndYesterdayStr = (date: string) => {
  if (isTodayDate(date)) {
    return '今天'
  } else if (isYesterdayDate(date)) {
    return '昨天'
  } else if (isBeforeYesterdayDate(date)) {
    return `前天`
  }
  return ''
}

export function formatTodayAndYesterdayDate(dateTime) {
  const targetDate = dayjs(dateTime)

  if (targetDate.isToday()) {
    return `今天 ${targetDate.format('HH:mm:ss')}`
  } else if (targetDate.isYesterday()) {
    return `昨天 ${targetDate.format('HH:mm:ss')}`
  } else if (isBeforeYesterdayDate(dateTime)) {
    return `前天 ${targetDate.format('HH:mm:ss')}`
  } else {
    return targetDate.format('MM/DD HH:mm:ss')
  }
}

export const formatDate = (date: string, formatString = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(date).format(formatString)
}

export const formatHistoryTime = (date: string) => {
  return dayjs(date).fromNow()
}
