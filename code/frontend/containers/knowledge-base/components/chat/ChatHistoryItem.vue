<!-- eslint-disable vue/no-mutating-props -->
<template>
  <div :key="source.id" :class="[$style['chat-history-item']]" @click.stop>
    <template v-if="source.type === 'date'">
      <div :class="$style['chat-history-group-item']">
        <div :class="$style['chat-history-group-inner']">
          <span :class="$style['chat-name']">{{ source.name }}</span>
        </div>
      </div>
    </template>
    <template v-else>
      <div :class="$style['chat-history-item-wrapper']" @click="selectChat(source)">
        <DialogueFilled :class="$style['dialogue-icon']" />
        <LoadingOutlined :class="$style['loading-icon']" v-if="source._edit && source._loading" />
        <a-input
          v-if="source._edit"
          :class="[$style['chat-name-input'], source._loading ? $style['chat-name-loading'] : '']"
          :id="`chat-name-input-${source.id}`"
          v-model:value="source.name"
          allow-clear
          @pressEnter="store.onConfirmEditHistoryTitle(source)"
          @click.stop
          @mousedown.stop
        />
        <!-- input blur 事件，在Ctrl+C时会触发 -->
        <span v-else :class="$style['chat-name']" @dblclick.stop="onEdit(source)">{{ source.name }}</span>
        <div :class="$style['history-item-tools']">
          <EditOutlined :class="$style['edit-icon']" @click.stop="onEdit(source)" />
          <DeleteOutlined :class="$style['delete-icon']" @click.stop="onDelete(source, index)" />
        </div>
        <div :class="$style['history-item-time']">{{ formatTime(source.updateTime) }}</div>
      </div>
    </template>
  </div>
</template>
<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import { useKBStore } from '../../store'
import { updateChatNameAPI, deleteChatAPI } from '@/api/knowledge-base'
import { Modal } from 'ant-design-vue'
import { nextTick, ref, type PropType, getCurrentInstance } from 'vue'
import DialogueFilled from '../../images/DialogueFilled.vue'
import EditOutlined from '../../images/EditOutlined.vue'
import DeleteOutlined from '../../images/DeleteOutlined.vue'
import { LoadingOutlined } from '@ant-design/icons-vue'
import { formatTodayAndYesterdayDate, formatDate } from '../../utils/date'

const props = defineProps({
  source: {
    type: Object as PropType<any>,
    required: true
  },
  index: {
    type: Number,
    required: true
  },
  listExpand: {
    type: Boolean,
    required: true
  },
  onClose: {
    type: Function
  }
})

const store = useKBStore()
const { chatHistoryList, currentChat, originChatHistoryList } = storeToRefs(store)

const { onClose } = props
const { listExpand } = toRefs(props)
const vm = getCurrentInstance()?.proxy as any

const selectChat = item => {
  track({ name: '查看历史记录', keyword: item.name, page: '问答页' })
  store.selectChat(item)
  onClose?.()
}

const onEdit = async item => {
  item._name = item.name
  item._edit = true
  await nextTick()
  document.getElementById(`chat-name-input-${item.id}`)?.focus()
  // 阻止 ant-input 点击冒泡
  const node = vm.$el.querySelector(`.${vm.$style['chat-name-input']}`)
  node.onclick = e => {
    e.stopPropagation()
  }
}

const onDelete = (item, i) => {
  const modalClass = 'deleteChatHistoryItemClass'
  const onCancel = () => {
    // 关闭弹窗
    const node = document.querySelector(`.${modalClass}`)?.parentElement?.parentElement as HTMLElement
    if (node) {
      console.log('deleted', node?.parentElement?.removeChild(node))
    }
  }
  Modal.confirm({
    type: 'warn',
    title: '确认删除吗？',
    content: '删除后将无法恢复',
    wrapClassName: modalClass,
    okText: '确认',
    cancelText: '取消',
    onOk() {
      return deleteChatAPI({
        ids: [item.id]
      }).then(async () => {
        // 删除当前会话，开启新的会话
        if (item.id === currentChat.value?.id) {
          store.createNewChat()
        }
        await store.getChatHistory()
        if (listExpand.value) {
        } else {
          chatHistoryList.value = originChatHistoryList.value.slice(0, 5)
        }
        onCancel()
      })
    },
    onCancel
  })
}

function formatTime(time: string) {
  return listExpand.value ? formatDate(time, 'HH:mm:ss') : formatTodayAndYesterdayDate(time)
}
</script>

<style lang="less" module>
.common {
  position: relative;
  padding: 0 20px;
  height: 36px;

  display: flex;
  align-items: center;
  background: #fff;
  backdrop-filter: blur(20px);
  transition: all 0.3s;
}

.chat-history-item {
  width: 100%;
}

.chat-history-group-item {
  .common();
  width: 100%;

  font-size: 14px;
  font-weight: 400;
  color: #000000;
  line-height: 20px;
}

.chat-history-group-inner {
  width: 100%;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  border-bottom: 1px solid #e1e4eb;
}

.chat-history-item-wrapper {
  .common();
  font-size: 14px;
  font-weight: 400;
  color: #757a85;
  line-height: 20px;
  cursor: pointer;

  .dialogue-icon,
  .edit-icon,
  .delete-icon {
    flex-shrink: 0;
    flex-grow: 0;
    width: 20px;
    height: 20px;
    cursor: pointer;
  }

  .dialogue-icon {
    margin-right: 8px;
    color: var(--primary-color);
  }

  .edit-icon {
    margin: 0 12px;
    &:hover {
      color: var(--primary-color);
    }
  }

  .delete-icon {
    &:hover {
      color: #d94242;
    }
  }

  .chat-name {
    width: calc(100% - 84px);
    display: inline-block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chat-name-input {
    width: 100%;
    padding: 2px 11px;
  }

  .loading-icon {
    position: absolute;
    top: 10px;
    right: 100px;
    z-index: 2;
  }
  .chat-name-loading {
    :global {
      .ant-input-suffix {
        .anticon-close-circle {
          opacity: 0;
        }
      }
    }
  }

  .history-item-tools {
    margin-left: 8px;
    display: none;
    align-items: center;
  }

  .history-item-time {
    margin-left: 8px;
    display: flex;
    white-space: nowrap;
  }

  &:hover {
    background: #e0ebff;

    .chat-name {
      color: var(--primary-color);
    }

    .history-item-tools {
      display: flex;
    }
    .history-item-time {
      display: none;
    }
  }
}
</style>
