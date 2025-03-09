<template>
  <div :class="$style['chat-input-wrapper']">
    <template v-if="qaList.length > 0 && qaList[qaList.length - 1].status === 'DONE'">
      <div :class="$style['chat-input']">
        <!-- :auto-size="{ minRows: 3, maxRows: 3 }" -->
        <a-textarea
          :class="['scroll-bar p-3 pb-12', question ? $style['has-value'] : '']"
          v-model:value="question"
          placeholder="有问题尽管问我，Shift + Enter 换行"
          :maxlength="300"
          :autoSize="false"
          :disabled="chatLoading"
          @focus="onFocus"
          @pressEnter="onQuizQuestion"
          @click.stop
        />
        <div class="absolute bottom-0 left-0 bg-[#f2f4f7] flex items-center justify-between w-full px-2 pt-1 pb-2">
          <a-select
            v-model:value="_globalQAType"
            class="w-auto bg-white rounded-md"
            :options="GlobalQATypeOptions"
            :bordered="false"
            :dropdownMatchSelectWidth="false"
          ></a-select>
          <div :class="[$style['chat-input-suite']]">
            <span class="mr-2">{{ question?.length }}/300</span>
            <a-button type="primary" :class="$style['chat-send-btn']" @click="onQuizQuestion">
              <template #icon>
                <SendFilled :class="[$style['chat-send-icon']]" />
              </template>
              <span :class="[$style['chat-send-text']]">新增提问</span>
            </a-button>
          </div>
        </div>
      </div>
    </template>
    <div v-if="qaList.length > 0 && qaList[qaList.length - 1].status !== 'INIT'" :class="$style['chat-tip']">
      内容由 AI 大模型生成，请仔细甄别
    </div>
  </div>
</template>
<script setup lang="ts">
import { useGlobalQAStore } from '../store'
import SendFilled from '~/containers/knowledge-base/images/SendFilled.vue'
import { GlobalQATypeOptions, GlobalQATypeEnums } from './helper'

const props = defineProps({
  chatType: {
    type: String as PropType<GlobalQATypeEnums>,
    default: GlobalQATypeEnums.PERSONAL
  }
})
const { chatType } = toRefs(props)
const _globalQAType = ref(GlobalQATypeEnums.PERSONAL)
watchEffect(() => {
  _globalQAType.value = chatType.value
})

const question = ref('')

const globalQAStore = useGlobalQAStore()
const { chatLoading, chatInputting, qaList } = storeToRefs(globalQAStore)

const onFocus = () => {}

const onQuizQuestion = async e => {
  if (e.shiftKey || !question.value) {
    return
  }
  if (chatLoading.value) return
  setTimeout(() => {
    nextTick(() => {
      question.value = ''
    })
  })

  track({ name: `输入问题提问`, keyword: question.value, page: '全局问答' })
  await globalQAStore.onQuizQuestion({ question: question.value, qaType: _globalQAType.value })
}
</script>
<style lang="less" module>
.chat-input-wrapper {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  margin-top: 20px;

  .chat-input {
    position: relative;
    background: #f2f4f7;
    border-radius: 8px;
    border: 1px solid #ffffff;
    backdrop-filter: blur(8px);

    :global {
      .ant-input {
        height: 100px !important;
        border-color: transparent !important;
        box-shadow: none !important;
        background: transparent;
        border-radius: 6px;
        backdrop-filter: blur(4px);
        resize: none;
      }
    }
    .chat-input-suite {
      display: flex;
      align-items: center;
      transition: all 0.3s ease-in-out;
    }

    .has-value + .chat-input-suite {
      // bottom: 4px;
    }

    .chat-send-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 32px;
      border-color: transparent;
      transition: all 0.3s ease-in-out;
    }
    .chat-send-icon {
      width: 20px;
      height: 20px;
      // color: var(--primary-color);
      color: white;
      cursor: pointer;

      &:hover {
        opacity: 0.85;
      }
    }
    .chat-send-text {
      margin-left: 6px;
    }
  }

  .chat-tip {
    margin: 2px 0;
    font-size: 12px;
    color: #999;
    user-select: none;
    text-align: center;
  }
}
</style>
