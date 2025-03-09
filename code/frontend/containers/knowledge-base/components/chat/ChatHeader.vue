<template>
  <div :class="$style['chat-header']">
    <div :class="$style['chat-header-label']">
      <span
        v-for="item in tabList"
        :class="{ [$style['active']]: activeKey == item.key }"
        @click="emit('update:activeKey', item.key)"
        >{{ item.label }}</span
      >
    </div>
    <div :class="$style['chat-header-tools']" v-show="activeKey === ChatTypeEnums.CHAT">
      <!-- <a-tooltip placement="bottom" overlayClassName="acg-tooltip" title="重新生成">
        <Loading3QuartersOutlined :class="[$style.icon , $style['regenerate-icon']]" @click="emit('reQuiz')" />
      </a-tooltip> -->
      <a-tooltip placement="left" overlayClassName="acg-tooltip" title="开启新的对话">
        <NewChatOutlined :class="[$style.icon, $style['infer-icon']]" @click="emit('reInfer')" />
      </a-tooltip>
      <ChatHistory />
    </div>
    <div :class="$style['chat-header-tools']" v-show="activeKey === ChatTypeEnums.SUMMARY">
      <!-- <a-tooltip placement="bottom" overlayClassName="acg-tooltip" title="重新生成">
        <Loading3QuartersOutlined :class="[$style.icon , $style['regenerate-icon']]" @click="emit('reGenerate')" />
      </a-tooltip> -->
      <a-tooltip placement="bottomLeft" overlayClassName="acg-tooltip" title="复制总结内容">
        <img src="../../images/CopyOutlined.svg" alt="" :class="$style.icon" @click="emit('copySummary')" />
      </a-tooltip>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { MoreOne } from '@icon-park/vue-next'
import Loading3QuartersOutlined from '../../images/Loading3QuartersOutlined.vue'
import ChatHistory from './ChatHistory.vue'
import ClockRecordOutlined from '../../images/ClockRecordOutlined.vue'
import NewChatOutlined from '../../images/NewChatOutlined.vue'
import { ChatTypeEnums, copy } from './helper'
import { useKBStore } from '../../store'

const store = useKBStore()
const { currentSummary, isMultiDocumentsMode } = storeToRefs(store)

const tabList = computed<{ key: string; label: string }[]>(() =>
  [
    currentSummary.value
      ? {
          key: 'summary',
          label: '总结'
        }
      : (null as any),
    {
      key: 'chat',
      label: '对话'
    }
  ].filter(Boolean)
)

const props = defineProps({
  activeKey: {
    type: String,
    default: 'chat'
  }
})

const emit = defineEmits(['reQuiz', 'reInfer', 'reGenerate', 'copySummary', 'update:activeKey'])
</script>
<style lang="less" module>
.chat-header {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  padding: 0 20px;
  width: 100%;
  height: 40px;
  background: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;

  &-label {
    font-size: 14px;

    line-height: 20px;
    display: flex;
    gap: 20px;
    color: #929292;
    cursor: pointer;

    .active {
      color: var(--primary-color);
      font-weight: 600;
      position: relative;
      &:after {
        content: '';
        display: block;
        width: 100%;
        height: 2px;
        position: absolute;
        bottom: -10px;
        background: var(--primary-color);
      }
    }
  }

  &-tools {
    display: flex;
    align-items: center;
  }

  .icon {
    cursor: pointer;
    color: #000;
    &:hover {
      color: var(--primary-color);
    }
  }

  .infer-icon {
    margin-left: 12px;
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
  }

  .regenerate-icon {
    margin-left: 12px;
    width: 18px;
    height: 18px;
  }

  .close-icon {
    cursor: pointer;
    font-size: 20px;
  }
}
</style>
