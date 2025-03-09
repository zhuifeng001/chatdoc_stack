<template>
  <div :class="[$style['chat-toolbar'], visible ? $style['chat-toolbar-visible'] : '']">
    <template v-if="!isChatBreak">
      <a-tooltip placement="bottom" overlayClassName="acg-tooltip" title="很好">
        <PraiseOutlined
          :class="[answer.feedback === AnswerFeedback.PRAISE ? $style['active'] : '']"
          @click="onFeedbackChat(AnswerFeedback.PRAISE)"
        />
      </a-tooltip>
      <a-divider type="vertical" style="height: 30px; background-color: #e1e4eb" />
      <a-tooltip placement="bottom" overlayClassName="acg-tooltip" title="很差">
        <BadReviewOutlined
          :class="[answer.feedback === AnswerFeedback.BAD ? $style['active'] : '']"
          @click="onFeedbackChat(AnswerFeedback.BAD)"
        />
      </a-tooltip>
      <a-divider type="vertical" style="height: 30px; background-color: #e1e4eb" />
      <a-tooltip placement="bottom" overlayClassName="acg-tooltip" title="复制">
        <FilesOutlined @click="onCopy" />
      </a-tooltip>
      <a-divider type="vertical" style="height: 30px; background-color: #e1e4eb" />
      <!-- <a-tooltip placement="bottom" overlayClassName="acg-tooltip" title="编辑">
        <Edit @click="onEdit" />
      </a-tooltip> -->
      <a-divider type="vertical" style="height: 30px; background-color: #e1e4eb" />
    </template>

    <a-tooltip placement="bottom" overlayClassName="acg-tooltip" title="重新生成">
      <Loading3QuartersOutlined :class="[$style.icon, $style['regenerate-icon']]" @click="onReQuiz" />
    </a-tooltip>
  </div>
</template>
<script setup lang="ts">
import { message } from 'ant-design-vue'
import copy from 'copy-to-clipboard'
import { feedbackChatAPI } from '~/api'
import { AnswerFeedback } from '~/containers/knowledge-base/components/chat/helper'
import { useGlobalQAStore, type IQA } from '../store'
import PraiseOutlined from '~/containers/knowledge-base/images/PraiseOutlined.vue'
import BadReviewOutlined from '~/containers/knowledge-base/images/BadReviewOutlined.vue'
import FilesOutlined from '~/containers/knowledge-base/images/FilesOutlined.vue'
import Loading3QuartersOutlined from '~/containers/knowledge-base/images/Loading3QuartersOutlined.vue'
import { Edit } from '@icon-park/vue-next'
// import { useCreativeStore } from '~/containers/creative/store/useCreative'
import { initMarked, transformMd2HTML } from '~/libs/useTypewriter'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  isChatBreak: {
    type: Boolean,
    default: false
  },
  answer: {
    type: Object as PropType<IQA>,
    required: true
  }
})

const { answer } = toRefs(props)
const globalQAStore = useGlobalQAStore()
const { qaList } = storeToRefs(globalQAStore)

const onFeedbackChat = async (type: AnswerFeedback) => {
  if (answer.value.feedback === type) return

  await feedbackChatAPI({
    contentId: answer.value.contentId,
    feedback: type
  })
  track({ name: `答案反馈`, keyword: type === AnswerFeedback.PRAISE ? '点赞' : '踩', page: '全局问答' })
  answer.value.feedback = type
}

const onCopy = () => {
  copy(answer.value.answer)
  track({ name: `答案复制`, keyword: answer.value.answer, page: '全局问答' })
  message.success('已复制')
}

// const { quoteContent } = useCreativeStore()
// const onEdit = async () => {
//   const transformOptions = await initMarked()
//   const html = await transformMd2HTML(answer.value.answer, transformOptions)
//   quoteContent(html)
//   track({ name: `答案编辑`, keyword: html, page: '全局问答' })
// }

const onReQuiz = () => {
  const currentIndex = qaList.value.findIndex(o => o.id === answer.value.id)
  const item = qaList.value[currentIndex]
  if (item) {
    track({ name: `重新提问`, keyword: item.question, page: '全局问答' })
    globalQAStore.onQuizQuestion({ question: item.question, qaType: answer.value.chatType })
  }
}
</script>
<style lang="less" module>
@import url('~/containers/knowledge-base/components/styles/chat-toolbar.less');
.chat-toolbar {
  bottom: 0;
}
</style>
