<template>
  <div :class="[$style['chat-question'], isLastOne ? $style['visible'] : '']">
    <span> {{ question.content }}</span>
    <!-- <div :class="[$style['chat-toolbar'], $style['chat-toolbar-finished']]">
      <a-tooltip placement="bottom" overlayClassName="acg-tooltip" title="重新生成">
        <Loading3QuartersOutlined
          :class="[$style.icon, $style['regenerate-icon']"
          @click="store.onReQuizLastQuestion(question.content)"
        />
      </a-tooltip>
      <a-divider type="vertical" style="height: 30px; background-color: #e1e4eb" />
      <a-tooltip placement="bottom" overlayClassName="acg-tooltip" title="复制">
        <FilesOutlined @click="onCopy" />
      </a-tooltip>
    </div> -->
  </div>
</template>
<script lang="ts" setup>
import { useTheme } from '../../store/useTheme'
import { storeToRefs } from 'pinia'
import FilesOutlined from '../../images/FilesOutlined.vue'
import copy from 'copy-to-clipboard'
import { message } from 'ant-design-vue'
import Loading3QuartersOutlined from '../../images/Loading3QuartersOutlined.vue'
import { useKBStore } from '../../store'

const props = defineProps({
  question: {
    type: Object as PropType<any>,
    required: true
  }
})
const { question } = toRefs(props)
const { fontSize } = storeToRefs(useTheme())
const store = useKBStore()
const { qaList } = storeToRefs(store)

const isLastOne = computed(() => {
  if (!qaList.value.length) {
    return false
  }
  const currentIndex = qaList.value.findIndex((item: any) => item.id === question.value.id)
  return Boolean(qaList.value[currentIndex + 1].createTime && currentIndex !== qaList.value.length - 1)
})

const onCopy = () => {
  copy(props.question.content)
  message.success('已复制')
}
</script>

<style lang="less" module>
@import url('../styles/chat-toolbar.less');

.chat-question {
  position: relative;
  padding: 8px;
  max-width: 100%;
  min-width: 36px;

  display: inline-block;
  word-wrap: break-word;
  white-space: pre-wrap;

  text-align: left;
  font-size: v-bind(fontSize);
  font-weight: 400;

  line-height: calc(v-bind(fontSize) + 6px);

  &::selection {
    color: white;
    background: black;
  }

  .chat-toolbar {
    left: unset;
    right: 0;
    color: #000;
  }

  &.visible,
  &:hover {
    .chat-toolbar-finished {
      opacity: 1;
      visibility: visible;
    }
  }
}
</style>
