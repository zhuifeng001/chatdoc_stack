<template>
  <div :class="$style['chat-input-container']">
    <ChatCommonProblem :list="commonProblemList" @quiz="q => onQuizCommonQuestion(q, 'common')" />
    <ChatBreak v-if="globalChatInputting" top="-36px" @click="onStopChat" />
    <div :class="[$style['chat-input-wrapper'], 'chat-input-wrapper']">
      <div :class="$style['chat-input-left']">
        <a-tooltip
          v-if="!isMultiDocumentsMode && !historyStateData?.personal"
          placement="left"
          overlayClassName="acg-tooltip"
          title="常见问题"
        >
          <div :class="[$style['chat-common-problem-icon']]" @click.stop="onCommonProblemVisibleChange">
            <img src="../../images/CommonProblemFilled.png" alt="" />
          </div>
        </a-tooltip>
        <!-- v-if="historyStateData?.personal || isMultiDocumentsMode" -->
        <!-- <a-tooltip placement="left" overlayClassName="acg-tooltip" title="开启新的对话">
          <a-button :class="$style['chat-new-chat']" type="primary" @click="store.createNewChat(false)">
            <RefreshOutlined />
          </a-button>
        </a-tooltip> -->
      </div>

      <div :class="$style['chat-input']">
        <!-- :auto-size="{ minRows: 3, maxRows: 3 }" -->
        <a-textarea
          class="scroll-bar"
          v-model:value="question"
          placeholder="有问题尽管问我，Shift + Enter 换行"
          :maxlength="300"
          :autoSize="false"
          :disabled="chatLoading"
          @focus="onFocus"
          @pressEnter="onQuizQuestion"
          @click.stop
        />
        <div :class="$style['chat-input-suite']">
          <span>{{ question?.length }}/300</span>
          <SendFilled :class="[$style['chat-send-icon']]" @click="onQuizQuestion" :readonly="chatLoading" />
        </div>
      </div>
      <div :class="$style['chat-tip']">内容由 AI 大模型生成，请仔细甄别</div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { nextTick, ref } from 'vue'
import ChatCommonProblem from './ChatCommonProblem.vue'
import RefreshOutlined from '../../images/RefreshOutlined.vue'
import SendFilled from '../../images/SendFilled.vue'
import { storeToRefs } from 'pinia'
import { useKBStore } from '../../store'
import ChatBreak from './ChatBreak.vue'

const store = useKBStore()
const {
  chatLoading,
  qaList,
  globalChatInputting,
  commonProblemList,
  commonProblemVisible,
  historyStateData,
  isMultiDocumentsMode
} = storeToRefs(store)
const emit = defineEmits(['change-visible'])

const onCommonProblemVisibleChange = () => {
  commonProblemVisible.value = !commonProblemVisible.value
}

onBeforeUnmount(() => {
  onStopChat(false)
})

const question = ref('')
const onQuiz = async (question: string) => {
  if (!question) return
  await store.initiateQuestion(question)
}

const onFocus = () => {
  // commonProblemVisible.value = true
}

const onQuizQuestion = async e => {
  if (e.shiftKey) {
    return
  }
  if (chatLoading.value) return
  setTimeout(() => {
    nextTick(() => {
      question.value = ''
      // commonProblemVisible.value = false
    })
  })

  track({ name: `输入问题提问`, keyword: question.value, page: '问答页' })
  await onQuiz(question.value)
}

const onStopChat = (click = true) => {
  click && track({ name: `答案停止生成`, keyword: qaList.value.at(-2)?.content || '', page: '问答页' })
  store.chatEventEmitter.emit('chat-stop')
}

const onQuizCommonQuestion = (question: string, type?: 'common') => {
  onQuiz(question)
}
</script>
<style lang="less" module>
.chat-input-container {
  position: absolute;
  bottom: 0;
  left: 0;
  z-index: 1;
  flex-shrink: 0;
  flex-grow: 0;
  width: 100%;
  padding: 12px 20px 10px 8px;

  background: linear-gradient(180deg, rgba(242, 244, 247, 0.1) 0%, rgba(225, 228, 235, 0.6) 100%);
  box-shadow: 0px -4px 8px 0px rgba(90, 118, 153, 0.06), 0px -1px 0px 0px #ffffff;
  backdrop-filter: blur(20px);
}
.chat-input-wrapper {
  position: relative;
  width: 100%;
  height: 125px;

  display: flex;

  .chat-input-left {
    display: flex;
    flex-direction: column;
  }

  .chat-new-chat {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    padding: 8px;
    color: #fff;
  }

  .chat-input {
    flex: 1;
    margin-left: 8px;
    position: relative;
    margin-bottom: 30px;

    :global {
      .ant-input {
        height: 100px !important;
        border-color: transparent !important;
        box-shadow: none !important;
        background: #ffffff;
        border-radius: 6px;
        backdrop-filter: blur(4px);
        resize: none;
      }
    }
    .chat-input-suite {
      position: absolute;
      right: 12px;
      bottom: 12px;
      display: flex;
      align-items: center;
    }
    .chat-send-icon {
      margin-left: 12px;
      width: 20px;
      height: 20px;
      color: var(--primary-color);
      cursor: pointer;

      &:hover {
        opacity: 0.85;
      }
    }
  }
}

.chat-tip {
  position: absolute;
  bottom: 0;
  right: 0;
  font-size: 12px;
  color: #999;
  user-select: none;
}

.chat-common-problem-icon {
  margin-bottom: 10px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  box-shadow: -4px 4px 12px 0px rgba(92, 112, 153, 0.51);

  backdrop-filter: blur(4px);

  transition: all 0.3s;
  color: var(--primary-color);
  cursor: pointer;

  will-change: bottom;

  &:hover {
    box-shadow: -4px 4px 20px 0px rgba(92, 112, 153, 0.7);
  }

  img {
    width: 100%;
    height: 100%;
  }
  svg {
    border-radius: 50%;
  }
}
</style>
