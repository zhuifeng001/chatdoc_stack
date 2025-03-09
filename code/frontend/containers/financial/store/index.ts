import { defineStore } from 'pinia'
import { getFilterResourceAPI, getHotSpotsAPI, getKBDocumentList } from '~/api'
import { getDefaultPagination } from '~/components/common/Pagination/helper'
import { KB_FINANCIAL_ID } from '~/containers/knowledge-base/helper'
import { useSelectedDocuments } from './useSelectedDocuments'
import { message } from 'ant-design-vue'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { FixedDateEnums, hotKeywords } from '../helpers'
import { useUser } from '~/containers/knowledge-base/store/useUser'
import { useGlobal } from '~/store'
import { globalWebCache } from '~/utils/web-cache'

export enum SearchStatusEnums {
  INIT = 0,
  START = 1,
  SUCCESS = 2,
  FAIL = 3
}

export const useFinancialStore = defineStore('financial', () => {
  const homeList = ref<any[]>([])
  const homeCondition = reactive({
    financeType: ['year'] as string[],
    concept: [] as string[],
    industry: [] as string[],
    financeDateType: FixedDateEnums.ALL,
    financeDate: [] as [Dayjs?, Dayjs?]
  })
  const homePagination = reactive(getDefaultPagination())
  const searchCondition = reactive({
    keywords: '',
    financeType: [] as string[],
    concept: [] as string[],
    industry: [] as string[],
    financeDateType: FixedDateEnums.ALL,
    financeDate: [] as [Dayjs?, Dayjs?]
  })
  const searchStatus = ref(SearchStatusEnums.INIT)
  const searchList = ref<any[]>([])
  const searchPagination = reactive(getDefaultPagination())
  const checkedMap = new Map<string, true>()
  const pageChecked = ref(false)
  const pageCheckedIndeterminate = ref(false)
  const industriesData = ref<{ name: string; value: string }[]>([])
  const reportTypesData = ref<{ name: string; value: string }[]>([])
  const conceptData = ref<{ name: string; value: string }[]>([])
  const hotIndustriesData = ref<{ name: string; value: number; cover: string }[]>([])

  const userStore = useUser()
  const { isLogin } = storeToRefs(userStore)

  const useGlobalStore = useGlobal()
  const { selectIds } = storeToRefs(useGlobalStore)
  const hotSpotsData = ref<string[]>([])
  const getHotSpotsData = async () => {
    let list: string[] = []
    const MAX_SPOTS = 6
    if ((list = globalWebCache.get('hotSpotsData'))) {
      return (hotSpotsData.value = list?.slice(0, MAX_SPOTS))
    }

    const res = await getHotSpotsAPI().catch(e => {
      console.log('e', e)
    })
    list = (res?.data?.spots?.alias || []).slice(0, MAX_SPOTS)
    if (list.length < MAX_SPOTS) {
      new Array(MAX_SPOTS - list.length).forEach(() => {
        list.push(hotKeywords[Math.floor(Math.random() * hotKeywords.length)])
      })
    }
    list = [...new Set<string>(list)]
    globalWebCache.set('hotSpotsData', list)
    return (hotSpotsData.value = list)
  }

  const route = useRoute()
  const currentListByPage = ref<any>([])
  watch(
    [() => route.path, searchList, homeList],
    () => {
      // !!!FIXED 添加延迟重新获取路由
      setTimeout(() => {
        currentListByPage.value = route.path.includes('/financial/search') ? searchList.value : homeList.value
      })
    },
    { immediate: true }
  )

  const onCancel = () => {
    currentListByPage.value.map(o => {
      o._checked = false
    })
  }

  // 切换页，初始化pageChecked
  watch(
    searchPagination,
    () => {
      pageChecked.value = false
    },
    { deep: true }
  )

  watch(pageChecked, () => {
    currentListByPage.value.forEach(o => {
      o._checked = pageChecked.value
    })
  })

  // 全部取消选中
  watch(
    () => currentListByPage.value?.length && currentListByPage.value?.every(o => !o._checked),
    v => {
      if (v) {
        pageChecked.value = false
      }
    }
  )
  // 全部选中
  watch(
    () => currentListByPage.value?.length && currentListByPage.value?.every(o => o._checked),
    v => {
      if (v) {
        pageChecked.value = true
      }
    }
  )
  // 部分选中
  watch(
    () => currentListByPage.value?.some(o => o._checked) && currentListByPage.value?.some(o => !o._checked),
    v => {
      pageCheckedIndeterminate.value = v
    }
  )

  const onChangeDocPagination = (current: number, pageSize: number) => {
    homePagination.current = current
    homePagination.pageSize = pageSize
    getDocListByHome()
  }

  const saveFilterSource = data => {
    const { concept = [], financeType = [], industry = [], hotIndustry = [] } = data || {}
    industriesData.value = industry || []
    reportTypesData.value = financeType || []
    conceptData.value = concept || []
    hotIndustriesData.value = hotIndustry || []
  }

  const getFilterSource = async () => {
    let data = globalWebCache.get('filterSource')
    if (data) {
      saveFilterSource(data)
      return data
    }

    const res1 = await getFilterResourceAPI().catch(e => {
      console.log('e :>> ', e)
    })
    saveFilterSource(res1?.data)

    if (res1?.data) {
      globalWebCache.set('filterSource', res1?.data)
    }
    return res1?.data || {}
  }

  const getFinanceDate = (dateArray: [Dayjs?, Dayjs?]) => {
    let dateScoped: (Dayjs | undefined)[] = []
    if (dateArray?.length) {
      const startDate = dateArray[0]
      const endDate = dateArray[1]
      dateScoped[0] = startDate ? startDate.startOf('month') : undefined
      dateScoped[1] = endDate ? endDate.endOf('month') : undefined
    }
    return dateScoped
  }

  const getDocListByHome = async () => {
    const dateScoped = getFinanceDate(homeCondition.financeDate)
    const res = await getKBDocumentList({
      financeType: homeCondition.financeType?.length ? homeCondition.financeType : undefined,
      industry: homeCondition.industry?.length ? homeCondition.industry : undefined,
      concept: homeCondition.concept?.length ? homeCondition.concept : undefined,
      financeDate: dateScoped?.length ? dateScoped : undefined,
      libraryId: KB_FINANCIAL_ID,
      status: [30],
      page: homePagination.current,
      pageSize: homePagination.pageSize,
      sort: { financeDate: 'DESC' }
    })
    homeList.value = res.data?.list || []
    homePagination.total = res.data?.total || 0

    return homeList.value
  }

  const getDocListBySearch = async (data: any = {}) => {
    searchStatus.value = SearchStatusEnums.START
    const dateScoped = getFinanceDate(searchCondition.financeDate)
    const res = await getKBDocumentList({
      keywords: searchCondition.keywords || undefined,
      financeType: searchCondition.financeType?.length ? searchCondition.financeType : undefined,
      financeDate: dateScoped?.length ? dateScoped : undefined,
      libraryId: KB_FINANCIAL_ID,
      status: [30],
      page: searchPagination.current,
      pageSize: searchPagination.pageSize,
      ...data,
      sort: { financeDate: 'DESC' }
    })
    searchList.value = res.data?.list || []
    searchPagination.total = res.data?.total || 0
    searchStatus.value = SearchStatusEnums.SUCCESS
    return searchList.value
  }

  const onChangeSearchDocPagination = (current: number, pageSize: number) => {
    searchPagination.current = current
    searchPagination.pageSize = pageSize
    getDocListBySearch()
  }

  const router = useRouter()
  const toAsk = data => {
    data.personal = false
    if (!isLogin.value) {
      selectIds.value = data
      useUser().showLogin()
      return
    }
    router.push({ name: 'knowledge-base', state: { data: JSON.stringify(data) } })
  }

  const selectedDocumentsHook = useSelectedDocuments()

  const initSelectedState = () => {
    setTimeout(() => {
      pageChecked.value = false
      pageCheckedIndeterminate.value = false
      selectedDocumentsHook.selectedDocumentVisible.value = false
    })
  }

  const initCache = () => {
    if (hotSpotsData.value?.length) {
      globalWebCache.set('hotSpotsData', toRaw(hotSpotsData.value))
    }
    if (conceptData.value?.length || industriesData.value?.length || reportTypesData.value?.length) {
      globalWebCache.set('filterSource', {
        concept: toRaw(conceptData.value || []),
        financeType: toRaw(reportTypesData.value || []),
        industry: toRaw(industriesData.value || [])
      })
    }
  }

  return {
    initCache,
    hotSpotsData,
    getHotSpotsData,
    initSelectedState,
    homeList,
    homePagination,
    homeCondition,
    searchCondition,
    currentListByPage,
    searchStatus,
    searchList,
    searchPagination,
    checkedMap,
    pageChecked,
    pageCheckedIndeterminate,
    industriesData,
    reportTypesData,
    conceptData,
    hotIndustriesData,
    getFilterSource,
    getDocListByHome,
    getDocListBySearch,
    onChangeDocPagination,
    onChangeSearchDocPagination,
    toAsk,
    ...selectedDocumentsHook,
    onCancel
  }
})
