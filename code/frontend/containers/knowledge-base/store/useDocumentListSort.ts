import type { UserFile, UserFileData, UserFolder } from '../types'
import dayjs from 'dayjs'

export const useDocumentListSort = ({ originFileData, userFileData }) => {
  const groupByCompany = (list: UserFile[] = []) => {
    const res: UserFileData[] = []
    const companyMap = new Map<UserFolder, UserFile[]>()

    for (let i = 0; i < list.length; i++) {
      const file = list[i]
      const companyName = file.extraData?.company as string
      if (!companyName) {
        res.push(file)
        return res
      }

      let currCompanyFolder = [...companyMap.keys()].find(o => o.title === companyName)
      if (!currCompanyFolder) {
        const id = randomString(8)
        currCompanyFolder = {
          type: 'folder',
          _id: id,
          key: id,
          id: null as any,
          folderId: 0, // 顶级文件夹
          title: companyName,
          name: companyName,
          children: [],
          sort: i,
          _dummy: true // 伪造数据
        }
        companyMap.set(currCompanyFolder, [])
      }
      file.folderId = currCompanyFolder.id
      companyMap.get(currCompanyFolder)?.push(file)
    }

    for (const [folder, files] of companyMap) {
      folder.children.push(...files)
      res.push(folder)
    }
    return res
  }

  const sortByAddTime = () => {
    // 默认就是添加时间
    userFileData.value = groupByCompany(originFileData.value.slice())
  }

  const sortByFinancialTime = () => {
    const list = originFileData.value.slice()
    list.sort((a, b) => {
      const aTime = a.extraData?.financeDate as string
      const bTime = b.extraData?.financeDate as string
      if (!aTime && !bTime) return 0 // 排序不变
      if (!aTime) return 1 // aTime 不存在，bTime 存在，bTime 排在前面
      if (!bTime) return -1 // bTime 不存在，aTime 存在，aTime 排在前面
      return dayjs(bTime, 'YYYY-MM-DD').valueOf() - dayjs(aTime, 'YYYY-MM-DD').valueOf() // 都存在，按时间排序 desc
    })
    userFileData.value = groupByCompany(list)
  }

  const sortByDocumentName = () => {
    const list = originFileData.value.slice()
    list.sort((c1, c2) => {
      const a = c1.name
      const b = c2.name
      if (!a && !b) return 0 // 排序不变
      if (!a) return 1 // a 不存在，b 存在，b 排在前面
      if (!b) return -1 // b 不存在，a 存在，a 排在前面
      // 检测字符串是否以数字开头
      const isANumber = !isNaN(Number(a[0]))
      const isBNumber = !isNaN(Number(b[0]))

      // 如果一个字符串以数字开头而另一个不是，则调整它们的排序
      if (isANumber && !isBNumber) {
        return 1 // 把 a 排在 b 后面
      } else if (!isANumber && isBNumber) {
        return -1 // 把 a 排在 b 前面
      }
      // 如果两个字符串都是数字开头或都不是数字开头，使用 localeCompare
      return a[0].localeCompare(b[0])
    })
    userFileData.value = groupByCompany(list)
  }

  const sortByCompanyName = () => {
    const list = originFileData.value.slice()
    list.sort((c1, c2) => {
      const a = c1.extraData?.company as string
      const b = c2.extraData?.company as string
      if (!a && !b) return 0 // 排序不变
      if (!a) return 1 // a 不存在，b 存在，b 排在前面
      if (!b) return -1 // b 不存在，a 存在，a 排在前面
      // 检测字符串是否以数字开头
      const isANumber = !isNaN(Number(a[0]))
      const isBNumber = !isNaN(Number(b[0]))

      // 如果一个字符串以数字开头而另一个不是，则调整它们的排序
      if (isANumber && !isBNumber) {
        return 1 // 把 a 排在 b 后面
      } else if (!isANumber && isBNumber) {
        return -1 // 把 a 排在 b 前面
      }
      // 如果两个字符串都是数字开头或都不是数字开头，使用 localeCompare
      return a[0].localeCompare(b[0])
    })
    userFileData.value = groupByCompany(list)
  }

  // 全部导出
  return {
    sortByAddTime,
    sortByFinancialTime,
    sortByCompanyName,
    sortByDocumentName
  }
}
