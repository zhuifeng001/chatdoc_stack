<template>
  <div :class="[$style['answer-wrap'], item.sourceFiles?.length ? '' : $style['no-source']]">
    <div v-show="['DOING', 'DONE'].includes(item.status)" :class="$style['answer-header']">
      <AnswerIcon :class="$style['icon']" />
      <div :class="$style['text']">答案</div>
    </div>
    <div :class="[$style['answer-container'], 'answer-container']">
      <div v-show="item.status === 'DOING' && !chatInputting" :class="$style.loading">正在生成中...</div>
      <div class="chat-answer-content scroll-bar">
        <!-- <span :class="$style.dummy"></span> -->
      </div>
      <div :class="$style['control-item']"></div>
      <AnswerFeedback :answer="item" :visible="item.status === 'DONE'" :isChatBreak="isChatBreak" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { useTypewriter, type Typewriter } from '~/libs/useTypewriter'
import AnswerIcon from '../images/AnswerIcon.vue'
import {
  IntfinqReferenceMaxLength,
  IntfinqReferenceRegex,
  IntfinqReferenceStartsWith,
  useGlobalQAStore,
  type IQA
} from '../store'
import { getActiveStyle, getDefaultStyle } from '~/containers/knowledge-base/components/chat/helper'
import AnswerFeedback from './AnswerFeedback.vue'
import { Popover } from 'ant-design-vue'
import { createVNode, render } from 'vue'
import { debounce } from 'lodash-es'

const props = defineProps({
  item: {
    type: Object as PropType<IQA>,
    required: true
  }
})
const emit = defineEmits(['finish'])
const { item } = toRefs(props)
const globalQAStore = useGlobalQAStore()
const { chatInputting, chatLoading, currentQA, previewFile, pageList, highlightThumbnailPages } =
  storeToRefs(globalQAStore)
const stopChat = ref(false)
const isChatBreak = ref(false)
const typewriter: { value: Typewriter | null } = { value: null }

const getPageMarkRef = globalQAStore.getPageMarkRef

const vm = getCurrentInstance()?.proxy as any
const rendered = ref(false)

const getCurrentFile = (uuid: string) => {
  return item.value.sourceFiles?.find(o => o.uuid === uuid)
}

const clearAnswerMark = () => {
  rendered.value = false
  const PageMarkRef = getPageMarkRef()
  const shapes = PageMarkRef?.getMarkInstance()?.queryAllState('.chat-answer-item')
  shapes?.forEach(shape => {
    shape.destroy(false)
  })
}

type Pos = {
  id?: string
  page: number
  line: number
  retrieval_index: number
  firstPage?: number
  lines?: Pos[]
  _rendered?: boolean
  reference_tag: string
  uuid: string
}

const getSourceData = array => {
  const map = new Map<string, Pos[]>()
  for (const item of array) {
    let positions = map.get(item.uuid)
    if (!positions) {
      positions = []
      map.set(item.uuid, positions)
    }
    const [page, line] = item.ori_id.split(',').filter(Boolean)

    positions.push({
      page: +page || 0,
      line: +line,
      retrieval_index: item.i,
      reference_tag: item.reference_tag,
      uuid: item.uuid
    })
  }

  for (const [uuid, positions] of map) {
    // 合并同一个文档，召回索引一致
    const posArray: Pos[] = []
    let prevRetrievalIndex = -1
    let prevLines: Pos[] = []
    for (const o of positions) {
      o.id = randomString(12)
      if (prevRetrievalIndex === o.retrieval_index) {
        prevRetrievalIndex = o.retrieval_index
        o.line != null && prevLines.push(o)
        continue
      }
      prevRetrievalIndex = o.retrieval_index
      prevLines = []
      o.line != null && prevLines.push(o)
      o.lines = prevLines
      posArray.push(o)
    }
  }
  return map
}

const uuidToPosMap = shallowRef<Map<string, Pos[]>>()
const uniTagToPosMap = shallowRef<Map<string, Pos[]>>()

/**
 * 获取 referenceIndex : 匹配 reference_tag -> 对应的 uuid -> uuid对应的 index
 * @param content
 */
const replaceReferenceStr = (content: string) => {
  const ret = content.replace(IntfinqReferenceRegex, (s, reference_tag) => {
    const positions = uniTagToPosMap.value?.get(reference_tag)
    if (positions?.[0]) {
      const uuid = positions[0].uuid
      const referenceIndex = item.value.sourceFiles?.findIndex(o => o.uuid === uuid) || 0
      return `<a href="${reference_tag}"><sup>${String(referenceIndex + 1)}</sup></a>`
    }
    return reference_tag
  })
  return ret
}

const onInferFinish = () => {
  if (typewriter.value) {
    typewriter.value.notifyFinished()
  }
}

watch(
  () => item.value.source?.length && item.value.sourceFiles?.length,
  v => {
    if (!v) return

    const array = item.value.source

    // 聚焦召回页
    const data = getSourceData(array)
    uuidToPosMap.value = data
    uniTagToPosMap.value = [...data?.values()]?.reduce((acc, positions) => {
      for (const pos of positions) {
        const arr = acc.get(pos.reference_tag) || []
        arr.push(pos)
        acc.set(pos.reference_tag, arr)
      }
      return acc
    }, new Map())
  },
  { immediate: true }
)

const renderAnswerMark = () => {
  if (!uuidToPosMap.value?.size) return

  const PageMarkRef = getPageMarkRef()
  for (const [uuid, positions] of uuidToPosMap.value) {
    if (previewFile.value.uuid !== uuid) continue
    for (const o of positions) {
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

const locatePos = async (pos: Pos, uuid: string) => {
  if (uuid !== previewFile.value?.uuid) {
    const file = getCurrentFile(uuid)
    if (!file) {
      console.log('locatePos: 文档不存在')
      return
    }
    clearAnswerMark()
    globalQAStore.selectSourceFile(file)
    await globalQAStore.loadDocument(file, pos)
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

const destroy = () => {
  globalQAStore.globalChatEventEmitter.off(`chat-stop`, onChatBreakEvent)
  typewriter.value?.destroy()
  typewriter.value = null
}

watch(
  () => item.value?.status === 'DONE',
  v => {
    if (v) {
      onInferFinish()
    }
  }
)

let tempStr = ''
let abortRequestFunc = null as any

const onChatBreakEvent = () => {
  item.value.status = 'DONE'

  abortRequestFunc?.()
  isChatBreak.value = true
  stopChat.value = true
  chatInputting.value = false
  chatLoading.value = false
  typewriter.value?.immediateFinished()
  destroy()
}

const onChatInputting = ({ content, abort }: any) => {
  abortRequestFunc = abort
  // 停止生成
  if (stopChat.value) {
    return
  }

  if (typewriter.value && content) {
    tempStr += content
    const j = tempStr.search(IntfinqReferenceStartsWith)

    // 正常输出
    if (j === -1) {
      typewriter.value?.print(tempStr || '\n')
      tempStr = ''
      return
    }
    const prev = tempStr.slice(0, j) // 之前的字符串
    const curr = tempStr.slice(j) // IFTAG
    if (prev) {
      typewriter.value?.print(prev)
      tempStr = curr
    }

    if (curr.length > IntfinqReferenceMaxLength) {
      tempStr = replaceReferenceStr(curr)
      typewriter.value?.print(tempStr, tempStr.length)
      tempStr = ''
    }
  }
}

const popoverMap = new Map()

onMounted(async () => {
  // 流式输出
  globalQAStore.globalChatEventEmitter.on(`global-chat-add-${item.value.id}`, onChatInputting)

  // 停止生成
  globalQAStore.globalChatEventEmitter.on(`chat-stop`, onChatBreakEvent)

  // 记录详情页面
  if (item.value.answer) {
    item.value.answer = replaceReferenceStr(item.value.answer)
  }
  // 初始化 typewriter
  typewriter.value = await useTypewriter({
    selector: vm.$el.querySelector('.chat-answer-content'),
    parentSelector: document.getElementById('GlobalChatLeft') as HTMLElement,
    md: true,
    string: item.value?.answer,
    speed: 15,
    immediate: !item.value._typewriter,
    random: false,
    autoScroll: false,
    markerStyles: {
      background: '#1A66FF',
      display: 'none!important'
    },
    onFinish() {
      chatLoading.value = false
      if (stopChat.value) {
        return
      }
      emit('finish')
      if (item.value._typewriter) {
        setTimeout(() => {
          if (item.value.answer) {
            const answer = replaceReferenceStr(item.value.answer)
            typewriter.value?.rewrite(answer || '\n')
          }
          // 输出完，移动到答案区域
          ;(vm.$el as HTMLElement).parentElement?.parentElement?.parentElement?.scrollTo({
            top: vm.$el?.offsetTop - 64,
            behavior: 'smooth'
          })
          destroy()
        })
      }
    }
  })

  const wrapper = vm.$el.querySelector('.chat-answer-content') as HTMLElement
  const handleA = (target: HTMLElement) => {
    if (!target || target.tagName !== 'A') return
    const href = target.getAttribute('href')
    if (href) {
      const positions = uniTagToPosMap.value?.get(href)
      console.log('href', href, positions)
      if (positions?.length) {
        locatePos(positions[0], positions[0].uuid)
      }
    }
  }
  // 事件委托 a 标签
  wrapper.addEventListener('click', e => {
    e.preventDefault()
    const target = e.target as HTMLElement
    if (target.tagName === 'A') {
      handleA(target)
    } else if (target.tagName === 'SUP' || target.tagName === 'SUB') {
      handleA(target.parentElement as HTMLElement)
    }
  })

  const createSupVNode = child => createVNode('sup', {}, child)
  const createPopoverInstance = (content: string, text?: any) =>
    createVNode(
      Popover,
      {
        open: false,
        overlayClassName: 'tag-popover',
        content: content,
        placement: 'top'
      },
      () => createSupVNode(text)
    )

  const getFileByTag = (href: string) => {
    const positions = uniTagToPosMap.value?.get(href)
    if (!positions) return
    return getCurrentFile(positions[0].uuid)
  }

  const hoverA = debounce(
    (target: HTMLElement) => {
      const href = target.getAttribute('href') as string
      let popoverInstance = popoverMap.get(href)
      const filename = getFileByTag(href)?.name
      const sup = target.querySelector('sup')
      // 控制缓存实例
      if (popoverMap.get(target.getAttribute('href'))) {
        popoverInstance!.component!.props!.open = true
        return
      }
      // 只触发首次
      if (sup && !sup.hasAttribute('zghook')) {
        const text = sup.innerText
        popoverInstance = createPopoverInstance(filename, text)
        sup.parentElement?.removeChild(sup)
        render(popoverInstance, target)
        popoverInstance!.component!.props!.open = true
        popoverMap.set(href, popoverInstance)
      }
    },
    30,
    { leading: true, trailing: false }
  )

  const leaveA = (target: HTMLElement) => {
    const href = target.getAttribute('href') as string
    const popoverInstance = popoverMap.get(href)
    if (popoverInstance) {
      popoverInstance!.component!.props!.open = false
    }
  }

  // wrapper.addEventListener(
  //   'mouseover',
  //   e => {
  //     e.stopPropagation()
  //     e.preventDefault()
  //     const target = e.target as HTMLElement
  //     if (target.tagName === 'A') {
  //       hoverA(target)
  //     } else if (target.tagName === 'SUP' || target.tagName === 'SUB') {
  //       hoverA(target.parentElement as HTMLElement)
  //     }
  //   },
  //   true
  // )
  // wrapper.addEventListener(
  //   'mouseleave',
  //   e => {
  //     e.stopPropagation()
  //     e.preventDefault()
  //     const target = e.target as HTMLElement
  //     if (target.tagName === 'A') {
  //       leaveA(target)
  //     } else if (target.tagName === 'SUP' || target.tagName === 'SUB') {
  //       leaveA(target.parentElement as HTMLElement)
  //     }
  //   },
  //   true
  // )
})

const locatePosByDefault = async (uuid: string) => {
  const positions = uuidToPosMap.value?.get(uuid)
  return positions?.[0] && locatePos(positions[0], positions[0].uuid)
}

onBeforeUnmount(() => {
  onChatBreakEvent()
  popoverMap.clear()
})

defineExpose({
  locatePosByDefault
})
</script>
<style lang="less" module>
.answer-wrap {
  padding-top: 20px;
  border-top: 1px solid #e6e6e6;

  &.no-source {
    border-top: none;
  }

  .answer-header {
    display: flex;
    align-items: center;

    font-weight: 500;
    font-size: 16px;
    line-height: 24px;
    .icon {
      margin-right: 8px;
      width: 20px;
      height: 20px;
    }
    .text {
      flex-grow: 1;
    }
  }
  .answer-container {
    position: relative;
    padding-bottom: 36px;
    margin: 20px 0;

    font-weight: 400;
    font-size: 15px;
  }
}
</style>

<style lang="less">
@import url(~/assets/styles/answer.less);
</style>
