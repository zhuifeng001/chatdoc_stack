import type { Dayjs, OpUnitType } from 'dayjs'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
// import utc from 'dayjs/plugin/utc'
// dayjs.extend(utc)
dayjs.extend(relativeTime)

export const formatDate = (date: string, formatString = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(date).format(formatString)
}
export const formatDateByUtc = (date: string, formatString = 'YYYY-MM-DD HH:mm:ss') => {
  return dayjs(date).format(formatString)
}

export const disabledDate = (current: Dayjs) => {
  return current && current >= dayjs().endOf('day')
}

export const disabledDateTime = () => {
  const range = (start: number, end: number) => {
    const result: number[] = []

    for (let i = start; i < end; i++) {
      result.push(i)
    }

    return result
  }

  return {
    disabledHours: () => range(0, 24).splice(4, 10),
    disabledMinutes: () => range(30, 60),
    disabledSeconds: () => [55, 56]
  }
}

export const fromNow = (date: string) => {
  return dayjs(date).fromNow()
}

export const getFirstDate = (date: string, type: OpUnitType = 'date') => {
  return dayjs(date).startOf(type)
}
export const getLastDate = (date: string, type: OpUnitType = 'date') => {
  return dayjs(date).endOf(type)
}
