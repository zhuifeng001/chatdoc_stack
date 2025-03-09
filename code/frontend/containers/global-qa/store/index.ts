import { baseURL, PREFIX_URL, inferQuestionStreamAPI, getChatDetailAPI, getDocumentsByUuidsAPI } from '~/api'
import { ChatQAType } from '~/containers/knowledge-base/components/chat/helper'
import useEventEmitter from 'mitt'
import { useKBLibraryStore } from '~/containers/knowledge-base/store/useKBLibraryStore'
import { GlobalQATypeEnums, GlobalQATypeNumberEnums, QATypeMap, type Pos } from '../components/helper'

export interface IStreamData {
  content: string
  status: 'DOING' | 'DONE'
  stage: 'retrieve_result' | 'retrieve_file_detail'
  data?: any
}

export type GlobalInferParams = {
  question: string
  qaType: GlobalQATypeEnums
}

/**
 * 引用标识以这些符号（search - 正则匹配）开头
 */
export const IntfinqReferenceStartsWith = /[\(（【\{\[I]/

/**
 * 引用标识最大长度
 */
export const IntfinqReferenceMaxLength = 10

/**
 * 引用标识正则匹配，eg.
 * IFTAG1
 * (IFTAG1)
 * [IFTAG1]
 */
export const IntfinqReferenceRegex = /[\(\[\{（【]?(IFTAG[a-z0-9]+)[\)\]\}）】]?/g

export interface IQA {
  id: number | string
  question: string
  type: ChatQAType
  answer: string
  chatId?: string
  chatType: GlobalQATypeEnums
  status: 'INIT' | 'DOING' | 'DONE'
  source?: readonly any[]
  documents?: readonly any[]
  sourceFiles?: any[]
  contentId?: number
  _typewriter?: boolean
  feedback?: number
}

export type HistoryState = {
  chatId: number
  recordId: number
  chatType: number
}

export type IChat = {
  id: number
  recordId: number
  chatType: GlobalQATypeNumberEnums
}

export const useGlobalQAStore = defineStore('global-qa', () => {
  const previewFile = ref<any>()
  const chatLoading = ref(false)
  const chatInputting = ref(false)
  const qaList = ref<IQA[]>([])
  const route = useRoute()
  const globalQAType = ref<GlobalQATypeEnums>((route?.query?.qaType as GlobalQATypeEnums) || GlobalQATypeEnums.PERSONAL)
  const globalChatEventEmitter = useEventEmitter()
  const historyStateData = ref<HistoryState | null>()
  const currentChat = ref<IChat>()
  const currentQA = ref<IQA>()
  const currentQAIndex = computed(() => {
    return qaList.value.findIndex(item => currentQA.value?.id === item.id || currentQA.value?.contentId === item.id)
  })
  const isQADetail = computed(() => (route?.query?.question ? false : !!historyStateData.value?.recordId))
  const detailLoading = ref(isQADetail.value ?? true)

  const kbLibraryStore = useKBLibraryStore()

  const getDefaultQA = (params: GlobalInferParams) =>
    reactive({
      id: randomString(8),
      question: params.question,
      answer: '',
      type: ChatQAType.ANSWER,
      chatType: params.qaType,
      _typewriter: true,
      status: 'INIT'
    }) as IQA

  const getChatDetail = async () => {
    detailLoading.value = true
    const currentChatId = currentChat.value!.id
    const res = await getChatDetailAPI({ chatId: currentChatId, page: 1, num: 10000 }).finally(() => {
      detailLoading.value = false
    })
    // 处理数据
    const data = res.data?.list || []

    let prevQuestion = ''
    currentQA.value = data.find(item => {
      if (!prevQuestion && item.chatId !== currentChatId) return false
      if (item.type === ChatQAType.QUESTION) {
        prevQuestion = item.content
        return false
      }
      if (item.type === ChatQAType.ANSWER) {
        return Object.assign(item, {
          question: prevQuestion,
          answer: item.content,
          source: JSON.parse(item.source),
          documents: [],
          sourceFiles: [],
          contentId: item?.id,
          status: 'INIT',
          chatType: QATypeMap.get(currentChat.value!.chatType)
        })
      }
    })

    if (currentQA.value) {
      await focusCurrentQA(currentQA.value)
      qaList.value = [currentQA.value]
      currentQA.value.status = 'DONE'
    }
  }

  const focusCurrentQA = async (item: IQA) => {
    if (!item.documents?.length) {
      const uuids = getUuidsBySource(item)
      item.documents = (await getDocumentsByUuidsAPI(uuids))?.data
    }
    item.sourceFiles = getDocumentBySourceData(item)
    // 默认选中第一个文件
    await nextTick()
    useIdlePromise(() => {
      // if (!previewFile.value) {
      item.sourceFiles?.[0] && onSelectFileAndLocatePos(item.sourceFiles[0], qaList.value.length - 1)
      // }
    })
  }

  const initQAPage = () => {
    previewFile.value = null
    qaList.value = []
  }

  const initQAList = () => {
    const route = useRoute()
    try {
      historyStateData.value =
        (globalThis.history?.state?.data ? JSON.parse(globalThis.history?.state?.data) : null) ||
        (route?.query?.data ? JSON.parse(decodeURIComponent(route?.query?.data as string)) : null)
    } catch (error) {
      console.log('error', error)
      historyStateData.value = null
    }
    console.log('historyStateData.value', historyStateData.value)

    if (historyStateData.value) {
      if (!isClient) return
      const { chatId, recordId, chatType } = historyStateData.value
      currentChat.value = { id: chatId, recordId, chatType }
      getChatDetail()
    } else if (route.query?.question) {
      qaList.value = reactive([
        getDefaultQA({
          question: route.query.question as string,
          qaType: globalQAType.value
        })
      ])
    }
  }

  const globalInfer = async ({ question, qaType }: GlobalInferParams) => {
    if (chatInputting.value) {
      return
    }

    chatLoading.value = true
    chatInputting.value = false

    const currentItem = (currentQA.value = qaList.value[qaList.value.length - 1])

    let start = true

    stepCompRef.value?.[currentQAIndex.value]?.jumpToStep(0)

    setTimeout(() => {
      stepCompRef.value?.[currentQAIndex.value]?.jumpToStep(1)
    }, 1000)

    return inferQuestionStreamAPI({
      url: baseURL + PREFIX_URL + '/api/v1/chat/global/infer',
      data: {
        question,
        qaType: qaType,
        // (historyStateData.value?.chatType && QATypeMap.get(historyStateData.value?.chatType)) ?? globalQAType.value,
        stream: true
      },
      doing(data: IStreamData, abort) {
        // console.log('doing data', data)

        // 首次接收数据
        if (start && data.stage === 'retrieve_result') {
          stepCompRef.value?.[currentQAIndex.value]?.jumpToStep(2)
          // console.log('doing data', data)
          currentItem.status = 'DOING'
          start = false
        }

        if (data?.data) {
          // 获取到召回结果
          if (data.stage === 'retrieve_result' && data.data.source?.length) {
            currentItem.source = shallowReadonly<any[]>(data.data.source)
          }
          // 获取到召回文档信息
          if (data.stage === 'retrieve_file_detail' && data.data?.length) {
            currentItem.documents = shallowReadonly<any[]>(data.data)
            console.log('currentItem :>> ', currentItem)
            focusCurrentQA(currentItem)
          }
        }

        // 大模型流式输出
        if (data.content) {
          stepCompRef.value?.[currentQAIndex.value]?.jumpToStep(3)
          chatInputting.value = true
          globalChatEventEmitter.emit(`global-chat-add-${currentItem.id}`, { content: data.content, abort })
        }
      },
      done(data) {
        // console.log('done data', data)

        stepCompRef.value?.[currentQAIndex.value]?.jumpToStep(3)

        chatLoading.value = false
        chatInputting.value = false
        currentItem.status = 'DONE'
        currentItem.answer = data.content
        currentItem.contentId = data?.id
      },
      error(e) {
        console.log('qa error', e)

        qaList.value.pop()
        qaList.value.push({
          id: randomString(8),
          question,
          type: ChatQAType.ANSWER,
          chatType: qaType,
          answer: e.message || '服务器正在开小差，请稍后再试',
          _typewriter: false,
          status: 'DONE'
        })
      }
    })
  }

  /**
   * 发起新问题
   */
  const onQuizQuestion = async (params: GlobalInferParams) => {
    kbLibraryStore.initPage()
    previewFile.value = null

    qaList.value.push(getDefaultQA(params))
    if (isQADetail.value) {
      await nextTick()
    }
    globalInfer(params)
  }

  const getDocumentBySourceData = (item: IQA) => {
    if (!item.documents?.length) return []
    if (!item.source?.length) return []

    const documentMap = new Map(item.documents.map(doc => [doc.uuid, doc]))
    return getUuidsBySource(item)
      .map(uuid => documentMap.get(uuid))
      .filter(Boolean)
  }

  /**
   * 保留source中的文档顺序
   */
  const getUuidsBySource = (item: IQA) => {
    if (!item.source?.length) return []
    const seen = new Set()
    return item.source
      .filter(item => {
        if (!seen.has(item.uuid)) {
          seen.add(item.uuid)
          return true
        }
        return false
      })
      .map(o => o.uuid)
  }

  const selectSourceFile = async (doc: any) => {
    previewFile.value = doc
  }

  const AnswerRef = ref()
  const stepCompRef = ref()
  const onSelectFileAndLocatePos = async (doc, index: number) => {
    if (Array.isArray(AnswerRef.value)) {
      AnswerRef.value[index]?.locatePosByDefault(doc.uuid)
    } else {
      AnswerRef.value?.locatePosByDefault(doc.uuid)
    }
  }

  const loadDocument = async (file, pos?: Pos) => {
    kbLibraryStore.getDocumentDetail({ id: file.id, document_type: String(file.type) }, { brief: 'merge' })

    return new Promise(resolve => {
      globalChatEventEmitter.on('page-mark-init', () => {
        const PageMarkRef = kbLibraryStore.getPageMarkRef()
        pos && PageMarkRef?.getMarkInstance().changePage(pos.page + 1)
        globalChatEventEmitter.off('page-mark-init')
        resolve('1')
      })
      // globalChatEventEmitter.on('page-mark-init-full', () => {
      //   globalChatEventEmitter.off('page-mark-init-full')
      //   resolve('1')
      // })
    })
  }

  return {
    globalQAType,
    stepCompRef,
    AnswerRef,
    onSelectFileAndLocatePos,
    loadDocument,
    previewFile,
    historyStateData,
    isQADetail,
    detailLoading,
    globalChatEventEmitter,
    chatInputting,
    chatLoading,
    currentQA,
    qaList,
    initQAList,
    initQAPage,
    globalInfer,
    selectSourceFile,
    onQuizQuestion,
    ...kbLibraryStore
  }
})
