<template>
  <a-dropdown
    :class="$style['chat-history']"
    :open="visible"
    placement="bottom"
    :trigger="[isMobile() ? 'click' : 'click']"
    :getPopupContainer="node => node?.parentElement?.parentElement?.parentElement as HTMLElement"
    :overlayClassName="$style['chat-history-overlay']"
  >
    <div v-if="!isMultiDocumentsMode" :class="$style['chat-history-icon']" @click.stop="visible = !visible">
      <a-tooltip placement="bottomLeft" overlayClassName="acg-tooltip" title="历史对话记录">
        <ClockRecordOutlined />
      </a-tooltip>
    </div>
    <template v-slot:overlay>
      <div :class="$style['history-list-wrapper']">
        <VirtualList
          :class="[$style['chat-history-list'], 'scroll-bar']"
          :style="listExpand ? { height: historyWrapperHeight + 'px' } : { maxHeight: historyWrapperHeight + 'px' }"
          :list="chatHistoryList"
          :visible-count="3"
          :buffer-count="Math.floor(historyWrapperHeight / 36)"
          :item-height="36"
          item-key="id"
          :item-component="ChatHistoryItem"
          :extra-props="{ onClose, listExpand }"
        />
        <div
          :class="$style['chat-history-all']"
          v-if="originChatHistoryList?.length > 5 && !listExpand"
          @click.stop="listExpand = true"
        >
          <span>展开全部</span>
          <ArrowDefDownOutlined />
        </div>
      </div>
    </template>
  </a-dropdown>
</template>
<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import ClockRecordOutlined from '../../images/ClockRecordOutlined.vue'
import { useKBStore } from '../../store'
import { getCurrentInstance, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { isMobile } from '@/utils/device'
import VirtualList from '@/components/common/VirtualList/index.vue'
import ChatHistoryItem from './ChatHistoryItem.vue'
import ArrowDefDownOutlined from '../../images/ArrowDefDownOutlined.vue'
import { useResizeListener } from '@/utils/util'
import { formatTodayAndYesterdayDate, formatTodayAndYesterdayStr } from '../../utils/date'

const store = useKBStore()
const { chatHistoryList, originChatHistoryList, isMultiDocumentsMode } = storeToRefs(store)

const vm = getCurrentInstance()?.proxy as any

const visible = ref(false)

const onClose = () => {
  visible.value = false
  // 初始化编辑状态
  for (let i = 0; i < originChatHistoryList.value.length; i++) {
    const source = originChatHistoryList.value[i]
    if (source._edit) {
      store.onConfirmEditHistoryTitle(source)
    }
  }
}
watch(visible, () => {
  if (visible.value) {
    listExpand.value = false
  }
})

const listExpand = ref(false)
const historyWrapperHeight = ref(180)
const updateListHeight = () => {
  if (chatHistoryList.value?.length > 5 && listExpand.value) {
    const parent = document.querySelector('.kb-answer-container')
    if (!parent) return
    historyWrapperHeight.value = parent.clientHeight - 40 - 4
  } else {
    historyWrapperHeight.value = 180
  }
}

watch(
  [listExpand, originChatHistoryList],
  async () => {
    // listExpand.value = false 时， 返回 originChatHistoryList 的前 5 条数据
    // listExpand.value = true 时， 对 originChatHistoryList 每组的时间进行分组，在每天的那一组前面插入一条时间数据，
    // 生成新的数据，赋值给 chatHistoryList
    if (!listExpand.value) {
      chatHistoryList.value = originChatHistoryList.value.slice(0, 5)
    } else {
      const list: any[] = []
      let lastDate = ''
      for (let i = 0; i < originChatHistoryList.value.length; i++) {
        const source = originChatHistoryList.value[i]
        const date = formatDate(source.updateTime, 'YYYY-MM-DD')
        if (date !== lastDate) {
          const todayAndYesterdayStr = formatTodayAndYesterdayStr(source.updateTime)
          list.push({
            id: `date-${date}`,
            type: 'date',
            date: source.updateTime,
            name: todayAndYesterdayStr ? todayAndYesterdayStr + ' ' + date : date
          })
          lastDate = date
        }
        list.push(source)
      }
      chatHistoryList.value = list
    }

    await nextTick()
    updateListHeight()
  },
  { immediate: true }
)

let destroyResizeFunc: any
onMounted(() => {
  document.getElementById('__nuxt')?.addEventListener('click', onClose)
  const parent = document.body
  if (parent) {
    destroyResizeFunc = useResizeListener(parent, updateListHeight)
  }
})

onBeforeUnmount(() => {
  document.getElementById('__nuxt')?.removeEventListener('click', onClose)
  destroyResizeFunc?.()
})
</script>
<style lang="less" module>
.chat-history-icon {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  margin-left: 12px;

  svg {
    width: 20px;
    height: 20px;
    color: #000;
  }

  &:hover {
    svg {
      color: var(--primary-color);
    }
  }
}

.chat-history-list {
  width: 100%;
  background-color: #fff;
  height: 180px;
}

.chat-history-overlay {
  width: 100%;
  top: 40px !important;
  z-index: 980;
}

.history-list-wrapper {
  width: 100%;

  .chat-history-all {
    display: flex;
    align-items: center;
    justify-content: center;

    width: 100%;
    height: 36px;
    background-color: #fff;
    font-size: 14px;
    font-weight: 400;
    color: #000000;
    line-height: 20px;
    cursor: pointer;

    span {
      margin-right: 4px;
    }

    svg {
      color: #959ba6;
    }

    &:hover {
      span,
      svg {
        color: var(--primary-color);
      }
    }
  }
}
</style>
