import { computed, ref, watch, type Ref, shallowRef } from 'vue'
import type { KBLibraryStore } from './useKBLibraryStore'
import {
  getChatDetailAPI,
  getChatHistoryAPI,
  getCommonProblemAPI,
  getKBDocumentSummary,
  initiateQuestionAPI,
  updateChatNameAPI
} from '@/api/knowledge-base'
import { randomString } from '@/utils/crypto'
import { ChatQAType } from '../components/chat/helper'
import { delay } from '@/utils/util'
import type { UserFile, UserFileData, UserFolder } from '../types'
import { isParsingFile, KB_FOLDER_ID } from './helper'
import { message } from 'ant-design-vue'
import { useUser } from './useUser'
import { storeToRefs } from 'pinia'
import useEventEmitter from 'mitt'
import { baseURL, PREFIX_URL, inferQuestionStreamAPI } from '~/api'
import type { KBHistoryState } from '.'

export const useChat = ({
  isMultiDocumentsMode,
  kbLibraryStore,
  checkedDocuments,
  checkedFolders,
  selectedItem,
  selectedFile,
  historyStateData,
  fileFlatData
}: {
  isMultiDocumentsMode: Ref<Boolean>
  kbLibraryStore: KBLibraryStore
  checkedFolders: Ref<UserFolder[]>
  checkedDocuments: Ref<UserFile[]>
  selectedItem: Ref<UserFileData>
  selectedFile: Ref<UserFile>
  historyStateData: Ref<KBHistoryState | undefined>
  fileFlatData: Ref<UserFileData[]>
}) => {
  const { selectedKBLibrary } = kbLibraryStore
  const chatLoading = ref(false)
  const globalChatInputting = ref(false)
  const qaList = ref<any[]>([])
  const currentChat = ref<any>()
  const currentSummary = ref<string>()
  const userStore = useUser()
  const { isLogin } = storeToRefs(userStore)

  const checkedFolderIds = computed(() => checkedFolders.value?.map(o => o.id)?.filter(Boolean))
  const getFolderIds = () => {
    return (currentChat.value ? currentChat.value.context?.folderIds || [] : checkedFolderIds.value) || []
  }

  const checkedDocumentIds = computed(() =>
    checkedDocuments.value
      ?.map(o => o.id)
      ?.sort()
      ?.filter(Boolean)
  )
  const getDocumentIds = () => {
    return checkedDocumentIds.value || []
    // return (currentChat.value ? currentChat.value.context?.ids || [] : checkedDocumentIds.value) || []
  }

  const chatEventEmitter = useEventEmitter()

  const initiateQuestion = async (question: string) => {
    // 在提问中，不能继续提问
    if (chatLoading.value) return

    const documentIds = getDocumentIds()
    const folderIds = getFolderIds()
    chatLoading.value = true

    if (!documentIds.length && !folderIds.length) {
      message.warn('请先选择文档')
      chatLoading.value = false
      return
    }

    // 判断文档是否解析完成，如果是解析中的文档，则提示用户
    const existDocumentParsing = fileFlatData.value.some((o: any) => {
      return isParsingFile(o.status)
    })
    if (existDocumentParsing) {
      message.warn('存在文档正在解析中，请稍后再试')
      chatLoading.value = false
      return
    }

    // push 问题
    qaList.value.push({
      id: randomString(8),
      type: ChatQAType.QUESTION,
      content: question,
      chatId: currentChat.value?.id
    })
    // push 答案 loading
    const currentQA = reactive({
      id: randomString(8),
      contentId: undefined,
      content: '',
      questionSource: undefined as string | undefined,
      source: undefined,
      type: ChatQAType.ANSWER,
      chatId: currentChat.value?.id,
      _typewriter: true,
      status: 'INIT',
      createTime: ''
    })
    qaList.value.push(currentQA)
    let start = true
    await inferQuestionStreamAPI({
      url: baseURL + PREFIX_URL + '/api/v1/chat/infer',
      data: {
        libraryId: selectedKBLibrary.value?.id,
        chatId: currentChat.value?.id,
        documentIds,
        folderIds,
        question,
        KnowledgeBase: selectedItem.value.id === KB_FOLDER_ID || undefined,
        stream: true
      },
      doing(data, abort) {
        // 首次
        if (start) {
          // push 答案
          currentQA.type = ChatQAType.ANSWER
          currentQA.chatId = data?.chatId
          start = false
        }

        if (currentQA.status === 'RETRIEVE_RESULT') {
          currentQA.status = 'DOING'
        }

        if (data?.data) {
          if (data.stage === 'retrieve_result' && data.data.source?.length) {
            currentQA.status = 'RETRIEVE_RESULT'
            currentQA.questionSource = JSON.stringify(data.data.source)
          }
        }

        chatEventEmitter.emit(`chat-add-${currentQA.id}`, { content: data.content, abort })
      },
      done(data) {
        // console.log('data :>> ', data)
        currentQA.status = 'DONE'
        currentQA.content = data.content
        currentQA.contentId = data?.id
        // currentQA.source = data?.source // validateAnswer(data.content) ? '' :
        currentQA.createTime = data?.createTime
        if (!currentChat.value?.id) {
          currentChat.value = {
            id: data?.chatId,
            context: {
              ids: documentIds,
              folderIds: folderIds
            }
          }
          getChatHistory()
        }
      },
      error(e) {
        // pop loading
        qaList.value.pop()
        qaList.value.push({
          id: randomString(8),
          type: ChatQAType.ANSWER,
          content: e.message || '服务器正在开小差，请稍后再试',
          _typewriter: false,
          status: 'DONE'
        })
      }
    })
      .then(res => {})
      .catch(e => {})
      .finally(() => {
        chatLoading.value = false
      })
  }

  /**
   * 判断无效的答案
   */
  const validateAnswer = (answer: string) => {
    return /^很抱歉/.test(answer) || /在给出的内容中未找到关于/.test(answer)
  }

  const onReQuizLastQuestion = async (oldQuestion?: string) => {
    if (!oldQuestion) {
      const question = qaList.value.findLast(o => o.type === ChatQAType.QUESTION)
      oldQuestion = question?.content
    }
    if (!oldQuestion) return
    await initiateQuestion(oldQuestion)
  }

  const commonProblemVisible = ref(false)
  const commonProblemList = ref<any[]>([])
  const getCommonProblemList = async () => {
    if (!isLogin.value || isMultiDocumentsMode.value || historyStateData.value?.personal) return
    const documentIds = getDocumentIds()
    if (!documentIds.length) return
    const res = await getCommonProblemAPI({ documentIds })
    commonProblemList.value = res.data || []
    commonProblemVisible.value = !!commonProblemList.value?.length
  }

  const originChatHistoryList = ref<any[]>([])
  const chatHistoryList = ref<any[]>([])
  const getChatHistory = async () => {
    if (!isLogin.value) return
    const res = await getChatHistoryAPI({
      num: 10000,
      documentId: selectedFile.value?.id
    })
    originChatHistoryList.value = res.data || []
  }

  const isEdition = ref(false)

  const isExistTitle = item => {
    return chatHistoryList.value.some(o => o.id !== item.id && o.name === item.name)
  }

  const onConfirmEditHistoryTitle = async item => {
    if (isEdition.value) return

    if (!item.name || item.name === item._name) {
      item.name = item._name
      item._edit = false
      return false
    }

    if (isExistTitle(item)) {
      item.name = item._name
      message.warn('标题已存在')
      return false
    }

    isEdition.value = true

    item._loading = true
    updateChatNameAPI({
      chatId: item.id,
      name: item.name
    })
      .then(() => {
        item._name = item.name
        getChatHistory()
      })
      .catch(() => {
        item.name = item._name
      })
      .finally(() => {
        item._loading = false
        item._edit = false
        isEdition.value = false
      })
  }

  const getChatDetail = async () => {
    const res = await getChatDetailAPI({ chatId: currentChat.value.id, page: 1, num: 10000 })
    qaList.value = res.data?.list || []
  }

  const route = useRoute()
  const getChatFromChatId = async () => {
    const historyStateData = JSON.parse(history.state?.data || route?.query?.data || '{}')
    if (historyStateData?.from === 'record' && historyStateData) {
      const { chatId, folderIds, ids, recordId } = historyStateData || {}
      selectChat({ id: chatId, recordId, context: { folderIds: folderIds, ids } }, true)
    }
  }

  let destroyMessageFn = null as any

  const startText = computed(() => {
    return isMultiDocumentsMode.value
      ? 'Assistant 已读取您选择的文档，请开始和我对话…'
      : 'Assistant 已读取您的文档，请开始和我对话…'
  })
  /**
   * 开启新的会话
   */
  const createNewChat = (clear = true) => {
    if (!clear && qaList.value?.length && qaList.value.at(-1).type === ChatQAType.START) {
      destroyMessageFn?.()
      destroyMessageFn = message.success('已是最新对话')
      return
    }

    if (clear) {
      qaList.value = [
        {
          type: ChatQAType.START,
          content: startText.value
        }
      ]
    } else {
      // 有会话记录，并且最后一条不是分割线
      if (
        qaList.value.length &&
        ![ChatQAType.DIVIDER, ChatQAType.START].includes(qaList.value[qaList.value.length - 1].type)
      ) {
        qaList.value.push({
          type: ChatQAType.DIVIDER,
          content: '开启新的会话'
        })
        qaList.value.push({
          type: ChatQAType.START,
          content: startText.value
        })
      }
    }
    currentChat.value = undefined
  }

  const selectChat = async (chat, focus = false) => {
    currentChat.value = chat
    await getChatDetail()
    // 聚焦某个问题，需提供recordId
    if (focus) {
      await nextTick()
      useIdlePromise(() => {
        if (chat.recordId) {
          scrollToDom(document.getElementById('KBAnswerContainer')?.querySelector(`[data-id="${chat.recordId}"]`), {
            block: 'center'
          })
        }
      })
    }
  }

  /**
   * 总结文档
   */
  const getDocumentSummary = async (regeneration?: boolean) => {
    const res = await getKBDocumentSummary({
      id: selectedFile.value?.id,
      regeneration
    })
    currentSummary.value = res.data
    return res
  }

  watch(selectedFile, () => {
    if (selectedFile.value) {
      setTimeout(() => {
        getCommonProblemList()
        getChatHistory()
        // getDocumentSummary()
      }, 600)
    }
  })

  const documentFirstChanged = ref(true)
  // 选择文档变更，重新创建对话
  watch(
    () => checkedDocumentIds.value.join(','),
    (newV, oldV) => {
      if (newV) {
        createNewChat(documentFirstChanged.value)
        documentFirstChanged.value = false
      }
    }
  )
  const initChat = () => {
    commonProblemList.value = []
    currentSummary.value = ''
    documentFirstChanged.value = true
    qaList.value = []
    currentChat.value = undefined
    chatLoading.value = false
  }
  return {
    initChat,
    chatLoading,
    globalChatInputting,
    qaList,
    currentChat,
    currentSummary,
    commonProblemVisible,
    commonProblemList,
    initiateQuestion,
    getCommonProblemList,
    getDocumentSummary,
    onReQuizLastQuestion,
    createNewChat,
    getChatHistory,
    chatHistoryList,
    originChatHistoryList,
    onConfirmEditHistoryTitle,
    selectChat,
    getChatFromChatId,
    chatEventEmitter
  }
}
