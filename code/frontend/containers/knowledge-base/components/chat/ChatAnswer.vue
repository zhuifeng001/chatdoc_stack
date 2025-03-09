<template>
  <div
    :class="[
      $style['chat-answer'],
      exporting ? $style['chat-answer-export'] : '',
      finishStatus ? $style['chat-answer-finished'] : ''
    ]"
  >
    <div v-if="answer?.status === 'INIT' || questionSource?.length" :class="$style['chat-question-source']">
      <div :class="$style['answer-source-sum']">
        <div :class="$style.desc">{{ !questionSource?.length ? '检索答案中...' : '答案来源页：' }}</div>
      </div>
      <!-- size="small" -->
      <a-skeleton active :loading="!questionSource?.length" :paragraph="{ rows: 0 }" :title="{ width: '200px' }">
        <div :class="$style['source-item']" v-for="(item, index) in questionSource" :key="index" @click="onActive">
          <a-tooltip :title="getCurrentFile(item.uuid)?.title">
            <div v-if="isMultiDocumentsMode" :class="$style['file-name']">
              {{ getCurrentFile(item.uuid)?.title || '未知文档' }}
            </div>
            <div v-else :class="$style['file-icon']">
              <!-- <PageNumber2Outlined /> -->
              <Bookmark theme="outline" />
            </div>
          </a-tooltip>
          <div :class="[$style['source-pos'], 'scroll-bar']">
            <div
              :class="$style['source-pos-one']"
              v-for="(pos, j) in item.positions"
              :key="j"
              @click="onClickPos(pos, item)"
            >
              [{{ pos.page + 1 }}]
            </div>
          </div>
        </div>
      </a-skeleton>
    </div>
    <div v-if="answer?.status === 'RETRIEVE_RESULT'" style="margin: 4px 0 4px 4px">根据来源内容，生成答案中...</div>
    <!-- <QALoading v-else-if="answer?.status === 'INIT'" :class="$style['chat-loading']" /> -->
    <div class="chat-answer-content scroll-bar">
      <span :class="$style.dummy"></span>
    </div>
    <!-- <div :class="$style['chat-answer-source']" v-if="!isChatBreak && finishStatus && answerSource?.length">
      <div :class="$style['answer-source-sum']">
        <div :class="$style.desc">答案来源页：</div>
         <div :class="$style.sum">共 {{ answerSource?.reduce((t, o) => (t += o.positions.length), 0) }}</div> 
      </div>
      <div :class="$style['source-item']" v-for="(item, index) in answerSource" :key="index" @click="onActive">
        <a-tooltip :title="getCurrentFile(item.uuid)?.title">
          <div v-if="isMultiDocumentsMode" :class="$style['file-name']">{{ getCurrentFile(item.uuid)?.title || '未知文档' }}</div>
          <div v-else :class="$style['file-icon']">
            <PageNumber2Outlined />
          </div>
        </a-tooltip>
        <div :class="[$style['source-pos'], 'scroll-bar']">
          <div :class="$style['source-pos-one']" v-for="(pos, j) in item.positions" :key="j" @click="locatePos(pos, item)">
            {{ pos.page + 1 }}
          </div>
        </div>
      </div>
    </div> -->
    <div :class="[$style['chat-toolbar'], finishStatus ? $style['chat-toolbar-finished'] : '']">
      <a-tooltip v-if="!isChatBreak" placement="bottom" overlayClassName="acg-tooltip" title="很好">
        <PraiseOutlined
          :class="[answer.feedback === AnswerFeedback.PRAISE ? $style['active'] : '']"
          @click="onFeedbackChat(AnswerFeedback.PRAISE)"
        />
      </a-tooltip>
      <a-divider v-if="!isChatBreak" type="vertical" style="height: 30px; background-color: #e1e4eb" />
      <a-tooltip v-if="!isChatBreak" placement="bottom" overlayClassName="acg-tooltip" title="很差">
        <BadReviewOutlined
          :class="[answer.feedback === AnswerFeedback.BAD ? $style['active'] : '']"
          @click="onFeedbackChat(AnswerFeedback.BAD)"
        />
      </a-tooltip>
      <a-divider v-if="!isChatBreak" type="vertical" style="height: 30px; background-color: #e1e4eb" />
      <a-tooltip v-if="!isChatBreak" placement="bottom" overlayClassName="acg-tooltip" title="复制">
        <FilesOutlined @click="onCopy" />
      </a-tooltip>
      <a-divider v-if="!isChatBreak" type="vertical" style="height: 30px; background-color: #e1e4eb" />
      <!-- <a-tooltip v-if="!isChatBreak" placement="bottom" overlayClassName="acg-tooltip" title="编辑">
        <Edit @click="onEdit" />
      </a-tooltip> -->
      <a-divider v-if="!isChatBreak" type="vertical" style="height: 30px; background-color: #e1e4eb" />
      <a-tooltip placement="bottom" overlayClassName="acg-tooltip" title="重新生成">
        <Loading3QuartersOutlined :class="[$style.icon, $style['regenerate-icon']]" @click="onReQuiz" />
      </a-tooltip>
    </div>
  </div>
</template>
<script lang="ts" setup>
import type { Typewriter } from '@/libs/useTypewriter'
import {
  onBeforeUnmount,
  onMounted,
  watch,
  type PropType,
  toRefs,
  getCurrentInstance,
  nextTick,
  computed,
  ref
} from 'vue'
import { initMarked, transformMd2HTML, useTypewriter } from '@/libs/useTypewriter'
import { useKBStore } from '../../store'
import { storeToRefs } from 'pinia'
import { useInject } from '@/hooks/useInject'
import PraiseOutlined from '../../images/PraiseOutlined.vue'
import BadReviewOutlined from '../../images/BadReviewOutlined.vue'
import FilesOutlined from '../../images/FilesOutlined.vue'
import DownloadOutlined from '../../images/DownloadOutlined.vue'
import PageNumber2Outlined from '../../images/PageNumber2Outlined.vue'
import { PDF2DOC_API, feedbackChatAPI } from '@/api/knowledge-base'
import copy from 'copy-to-clipboard'
import { message } from 'ant-design-vue'
import { exportPDF } from '@/utils/pdf'
import { delay, useIdlePromise } from '@/utils/util'
import { base64ToBlob, openDownload } from '@/utils/file'
import type { UserFile } from '../../types'
import Loading3QuartersOutlined from '../../images/Loading3QuartersOutlined.vue'
import QALoading from '~/components/kit/QALoading.vue'
import { Bookmark, Edit, Page } from '@icon-park/vue-next'
import { getActiveStyle, getDefaultStyle, AnswerFeedback } from './helper'
// import { useCreativeStore } from '~/containers/creative/store/useCreative'

interface Answer {
  id: number
  content: string
  source: string
  questionSource: string
  feedback: AnswerFeedback
  status: 'INIT' | 'RETRIEVE_RESULT' | 'DOING' | 'DONE'
  contentId: number
  _typewriter: boolean
}

const props = defineProps({
  question: {
    type: Object as PropType<Answer>,
    required: true
  },
  answer: {
    type: Object as PropType<Answer>,
    required: true
  },
  activeAnswer: {
    type: Object as PropType<Answer | undefined>,
    default: () => ({} as Answer)
  }
})
const emit = defineEmits(['finish', 'active'])
const { question, answer, activeAnswer } = toRefs(props)
const vm = getCurrentInstance()?.proxy as any
const getCurrentNode = () => vm.$el // document.querySelector('.kb-answer-container ')

const { getPageMarkRef } = useInject(['getPageMarkRef'])

// const getAnswerSourceArray = () => {
//   try {
//     return JSON.parse(answer.value.source) || []
//   } catch (e) {
//     return []
//   }
// }
const getQuestionSourceArray = () => {
  try {
    return JSON.parse(answer.value.questionSource || answer.value.source) || []
  } catch (e) {
    return []
  }
}

type Pos = {
  id?: string
  page: number
  line: number
  retrieval_index: number
  firstPage?: number
  lines?: Pos[]
  _rendered?: boolean
}
type PosItem = { uuid: string; positions: Pos[] }

const getSourceData = array => {
  const map = new Map<string, Pos[]>()
  for (const item of array) {
    let positions = map.get(item.uuid)
    if (!positions) {
      positions = []
      map.set(item.uuid, positions)
    }
    const [page, line] = item.ori_id.split(',').filter(Boolean)

    positions.push({ page: +page || 0, line: +line, retrieval_index: item.i })
  }

  const res: any[] = []
  for (const [uuid, value] of map) {
    // const posArray = value.sort((a, b) => a.page - b.page)
    // const pageMap = new Map()
    // for (const o of posArray) {
    //   let lines = pageMap.get(o.page) as Array<any>
    //   if (!lines) {
    //     lines = []
    //     pageMap.set(o.page, lines)
    //   }
    //   !lines.includes(o.line) && lines.push(o.line)
    // }

    // let positions: any[] = []
    // for (const [page, lines] of pageMap) {
    //   positions.push({ page, lines })
    // }

    // 合并同一页的line
    // 合并连续页的page，前提是召回索引一致
    const posArray: Pos[] = []
    let prevFirstPage = -1
    let prevRetrievalIndex = -1
    let prevLines: Pos[] = []
    // 截取最大召回
    const MAX_RETRIEVAL_COUNT = 5 // 取前 5 个
    let i = 0
    for (const o of value) {
      if (prevRetrievalIndex !== o.retrieval_index && i >= MAX_RETRIEVAL_COUNT) break
      o.id = randomString(12)
      if (prevFirstPage === o.page || prevRetrievalIndex === o.retrieval_index) {
        prevRetrievalIndex = o.retrieval_index
        o.line != null && prevLines.push(o)
        continue
      }
      i++
      prevRetrievalIndex = o.retrieval_index
      prevLines = []
      prevFirstPage = o.page
      o.firstPage = prevFirstPage
      o.line != null && prevLines.push(o)
      o.lines = prevLines
      posArray.push(o)
    }

    res.push({
      uuid: uuid,
      positions: posArray
    })
  }
  return res
}

const questionSource = ref<any[]>()
watch(
  () => answer.value.questionSource || answer.value.source,
  v => {
    if (!v) return
    useIdlePromise(() => {
      const array = getQuestionSourceArray()
      useIdlePromise(() => {
        // 聚焦召回页
        const data = getSourceData(array)
        if (answer.value._typewriter || (historyStateData.value?.recordId || 0) + 1 === answer.value.id) {
          // typewriter.value?.start({ top: 36 })
          nextTick(() => {
            useIdlePromise(() => {
              if (!vm.$el) return
              data?.[0] && locatePos(data[0].positions[0], data[0])
            })
          })
        }
        questionSource.value = data
      })
    })
  },
  { immediate: true }
)

// const answerSource = computed<PosItem[]>(() => {
//   const array = getAnswerSourceArray()

//   return getSourceData(array)
// })

const store = useKBStore()
const {
  highlightThumbnailPages,
  previewFile,
  userFileData,
  pageList,
  isMultiDocumentsMode,
  chatLoading,
  globalChatInputting,
  qaList,
  historyStateData,
  commonProblemVisible
} = storeToRefs(store)
const getCurrentFile = (uuid: string) => {
  let file: any = null

  const dfs = list => {
    return list.find(f => {
      if (f.type === 'file' && f.uuid === uuid) {
        file = f
        return true
      }
      if (f.children?.length) {
        return !!dfs(f.children)
      }
    })
  }

  dfs(userFileData.value)

  return file
}

const rendered = ref(false)
watch(activeAnswer, async () => {
  if (answer.value.id === activeAnswer.value?.id) {
    // renderAnswerMark()
  } else if (rendered.value) {
    clearAnswerMark()
  }
})

const clearAnswerMark = () => {
  rendered.value = false
  const PageMarkRef = getPageMarkRef()
  const markInstance = PageMarkRef?.getMarkInstance()
  const shapes = markInstance?.queryAllState('.chat-answer-item')
  shapes?.forEach(shape => {
    shape.destroy(false)
  })
  markInstance?.render()
}

const renderAnswerMark = () => {
  if (!questionSource.value?.length) return

  const PageMarkRef = getPageMarkRef()
  for (const item of questionSource.value) {
    if (previewFile.value.uuid !== item.uuid) continue
    for (const o of item.positions) {
      for (const pos of o.lines || []) {
        for (const linePos of pos.lines || []) {
          const { page: linePage, line } = linePos
          const page = linePage + 1
          const pageAreas = pageList.value[page - 1]?.areas
          if (pageAreas?.[line]?.pos?.length) {
            PageMarkRef?.createMark({
              page,
              position: pageAreas[line]?.pos,
              classNames: ['chat-answer-item', `${o.id}`],
              canvasStyleOptions: getDefaultStyle()
            })
          }
        }
      }
    }
  }
  rendered.value = true
}

const onClickPos = (pos: Pos, item) => {
  track({ name: `查看来源页`, keyword: String(pos.page), page: '问答页' })
  return locatePos(pos, item)
}

const locatePos = async (pos: Pos, item) => {
  if (!vm.$el) return

  emit('active', answer.value)

  if (item.uuid !== previewFile.value.uuid) {
    const file = getCurrentFile(item.uuid)
    if (!file) {
      // message.warn('文档不存在')
      return
    }
    clearAnswerMark()
    // await store.getDocumentDetail({ id: file.id })

    // 是否有目录
    // const folderIndex = userFileData.value.findIndex(o => o.type === 'folder' && o.id === file.folderId)
    // const folder = userFileData.value[folderIndex]

    // if (folder) {
    //   folder._autoActive = true
    //   folder._expand = true
    //   store.onActive(folder, true)
    //   console.log('folder', folder)
    //   await delay(500)
    // }
    file._autoActive = true
    store.onActive(file)

    await new Promise(resolve => {
      const arr: number[] = []
      const over = (v = 1) => {
        arr.push(v)
        if (arr.length === 2) {
          resolve('1')
        }
      }
      store.eventEmitter.on('page-mark-init', () => {
        const PageMarkRef = getPageMarkRef()
        PageMarkRef?.getMarkInstance().changePage(pos.page + 1)
        store.eventEmitter.off('page-mark-init')
        over()
      })
      store.eventEmitter.on('page-mark-init-full', () => {
        store.eventEmitter.off('page-mark-init-full')
        over()
      })
    })
  } else {
    await delay(0)
  }

  const PageMarkRef = getPageMarkRef()
  const shapes = PageMarkRef?.getMarkInstance()?.queryAllState(`.${pos.id}`)
  if (!shapes?.length) {
    renderAnswerMark()
  }
  const list = pos.lines || []
  PageMarkRef?.removeActive({ shapeOptions: getDefaultStyle() })
  // 倒排 聚焦第一个
  const activeOptions = list.map(o => ({ page: o.page + 1, selector: `.${pos.id}` })).reverse()
  highlightThumbnailPages.value = pos?.lines?.map(o => o.page) || []
  PageMarkRef?.batchSetActive(activeOptions, {
    block: 'start',
    shapeOptions: getActiveStyle()
  })
}

let typewriter: { value: Typewriter | null } = { value: null }

const autoScroll = ref(true)
const setAutoScroll = (auto = false) => {
  if (!globalChatInputting.value) return
  autoScroll.value = auto
  typewriter.value?.setAutoScroll(auto)
}

const finishStatus = ref(false)
const stopChat = ref(false)
const isChatBreak = ref(false)

onMounted(async () => {
  finishStatus.value = false

  store.chatEventEmitter.on(`chat-add-${answer.value.id}`, ({ content, abort }: any) => {
    abortRequestFunc = abort
    commonProblemVisible.value = false
    // 停止生成
    if (stopChat.value) {
      return
    }
    globalChatInputting.value = true
    if (typewriter.value && content) {
      typewriter.value?.print(content || '\n')
    }
  })

  // 停止生成
  store.chatEventEmitter.on(`chat-stop`, onChatBreakEvent)

  // 初始化 typewriter
  typewriter.value = await useTypewriter({
    selector: vm.$el.querySelector('.chat-answer-content'),
    parentSelector: document.getElementById('KBAnswerContainer') as HTMLElement,
    md: true,
    string: answer.value?.content,
    speed: 15,
    immediate: !answer.value._typewriter,
    random: false,
    autoScroll: true,
    markerStyles: {
      background: '#1A66FF'
    },
    onFinish() {
      finishStatus.value = true
      globalChatInputting.value = false
      if (stopChat.value) {
        return
      }
      emit('finish')
      if (answer.value._typewriter) {
        setTimeout(() => {
          if (answer.value.content) {
            typewriter.value?.rewrite(answer.value.content || '\n')
          }
          // questionSource.value?.[0] && locatePos(questionSource.value[0].positions[0], questionSource.value[0])
          destroy()
        })
      }
    }
  })
})

let abortRequestFunc = null as any

const onChatBreakEvent = () => {
  abortRequestFunc?.()

  isChatBreak.value = true
  stopChat.value = true
  globalChatInputting.value = false
  chatLoading.value = false
  finishStatus.value = true
  typewriter.value?.immediateFinished()
  destroy()
}

const onInferFinish = () => {
  if (typewriter.value) {
    typewriter.value.notifyFinished()
  }
}

watch(
  () => answer.value?.status === 'DONE',
  v => {
    if (v) {
      onInferFinish()
    }
  }
)

const destroy = () => {
  store.chatEventEmitter.off(`chat-stop`, onChatBreakEvent)
  typewriter.value?.destroy()
  typewriter.value = null
}

onBeforeUnmount(() => {
  onChatBreakEvent()
})

const onFeedbackChat = async (type: AnswerFeedback) => {
  if (answer.value.feedback === type) return

  await feedbackChatAPI({
    contentId: answer.value.contentId,
    feedback: type
  })
  track({ name: `答案反馈`, keyword: type === AnswerFeedback.PRAISE ? '点赞' : '踩', page: '问答页' })
  answer.value.feedback = type
}

const onCopy = () => {
  copy(answer.value.content)
  track({ name: `答案复制`, keyword: answer.value.content, page: '问答页' })
  message.success('已复制')
}

// const { quoteContent } = useCreativeStore()
// const onEdit = async () => {
//   const transformOptions = await initMarked()
//   const html = await transformMd2HTML(answer.value.content, transformOptions)
//   quoteContent(html)
//   track({ name: `答案编辑`, keyword: html, page: '问答页' })
// }

const exporting = ref(false)
const onExportPDF = () => {
  exporting.value = true
  const contentNode = vm.$el.querySelector('.chat-answer-content') as HTMLElement
  const filename = question.value.content + '.pdf'
  useIdlePromise(async () => {
    await exportPDF(contentNode, { x: 10, y: 10, filename })
  }).finally(() => {
    exporting.value = false
  })
}

const onExportDOC = () => {
  exporting.value = true
  const contentNode = vm.$el.querySelector('.chat-answer-content') as HTMLElement
  const filename = question.value.content + '.docx'
  useIdlePromise(async () => {
    const blob = await exportPDF(contentNode, { x: 10, y: 10, type: 'blob', filename })
    const res: any = await PDF2DOC_API(blob)
    openDownload(
      base64ToBlob(res.result, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      filename
    )
  }).finally(() => {
    exporting.value = false
  })
}

const onReQuiz = () => {
  const currentIndex = qaList.value.findIndex(o => o.id === answer.value.id)
  const question = qaList.value[currentIndex - 1]
  if (question) {
    track({ name: `重新提问`, keyword: question.content, page: '问答页' })
    store.onReQuizLastQuestion(question.content)
  }
}

defineExpose({
  setAutoScroll
})
</script>
<style lang="less" module>
@import url('../styles/chat-toolbar.less');

.chat-answer {
  position: relative;
  max-width: 100%;
  min-height: 36px;
  min-width: 36px;
  padding: 8px;

  &.chat-answer-finished {
    min-width: 200px;
  }

  &:hover {
    .chat-toolbar-finished {
      opacity: 1;
      visibility: visible;
    }
  }

  .chat-answer-source {
    margin-top: 12px;
    border-top: 1px solid #e1e4eb;
  }

  .chat-question-source {
    padding-bottom: 12px;
    margin-bottom: 12px;
    border-bottom: 1px solid #e1e4eb;

    :global {
      .ant-skeleton-title {
        margin-top: 4px;
        margin-bottom: 0;
      }
      .ant-skeleton-paragraph {
        margin-top: 0;
        margin-bottom: 0;
      }
    }
  }

  .answer-source-sum {
    margin: 4px 0 6px 0;
    padding: 0 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .desc {
      font-size: 14px;
      font-weight: 400;
      color: #757a85;
      line-height: 20px;
    }

    .sum {
      position: relative;
      font-size: 14px;
      font-weight: 400;
      color: #000000;
      line-height: 20px;

      &::before {
        position: absolute;
        left: -16px;
        top: 6px;
        content: ' ';
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: var(--primary-color);
      }
    }
  }

  .source-item {
    padding: 4px 4px 4px 8px;
    display: flex;
    align-items: center;
    justify-content: flex-start;

    height: 32px;
    background: #f2f4f7;
    border-radius: 4px;

    .file-name {
      padding-right: 10px;
      flex-shrink: 1;
      // flex-basis: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: inline-block;

      font-size: 14px;
      font-weight: 400;
      color: #000000;
      line-height: 20px;
    }

    .file-icon {
      margin-right: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;

      svg {
        width: 18px;
        height: 18px;
        color: #757a85;
      }
    }
  }

  .source-pos {
    flex-shrink: 0;
    height: 100%;
    display: flex;
    align-items: center;
    overflow-x: auto;
    overflow-y: hidden;

    &-one {
      margin-right: 8px;
      background: #e0ebff;
      border-radius: 4px;
      padding: 0px 8px 2px;
      color: var(--primary-color);
      font-size: 12px;
      cursor: pointer;
    }

    &::-webkit-scrollbar {
      display: inline-block;
      width: 3px;
      height: 3px;
    }
    &::-webkit-scrollbar-thumb:vertical {
      height: 3px;
      background-color: rgba(174, 174, 184, 0.4);
      border-radius: 3px;
    }
  }
}

.chat-answer-export-dialog {
  z-index: 100;
  :global {
    a:hover {
      color: var(--primary-color);
    }
  }
}

.chat-answer-export {
  .chat-toolbar {
    display: none;
  }
}

.chat-loading {
  display: flex;
  align-items: center;
}
</style>
<style lang="less">
.chat-answer-content {
  position: relative;
  min-height: 20px;
}
</style>
