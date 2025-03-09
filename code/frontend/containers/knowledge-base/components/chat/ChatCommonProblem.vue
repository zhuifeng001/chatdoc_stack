<template>
  <div class="chat-common-problem" @click.stop>
    <div
      :class="[
        $style['common-problem-list'],
        'scroll-bar',
        commonProblemVisible && list?.length ? $style['common-problem-visible'] : ''
      ]"
    >
      <div :class="$style['common-problem-item']" v-for="(value, i) in list" :key="i">
        <div :class="$style['problem-index']">{{ i + 1 }}.</div>
        <div :class="$style['problem-wrapper']" @click="onClick(value)">
          <div :class="$style['problem-label']">{{ value }}</div>
          <ArrowRightOutlined :class="$style['problem-send']"> </ArrowRightOutlined>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, type PropType, onMounted, getCurrentInstance, onBeforeUnmount, watch, nextTick } from 'vue'
import ArrowRightOutlined from '../../images/ArrowRightOutlined.vue'
import { storeToRefs } from 'pinia'
import { useKBStore } from '../../store'
import { delay } from '@/utils/util'
defineProps({
  list: {
    type: Array as PropType<any[]>,
    default: () => []
  }
})
const emit = defineEmits(['quiz', 'change'])
const { commonProblemVisible } = storeToRefs(useKBStore())

const vm = getCurrentInstance()?.proxy as any

const onClose = () => {
  commonProblemVisible.value = false
}

const onClick = value => {
  track({ name: `推荐问题提问`, keyword: value, page: '问答页' })

  emit('quiz', value)
}

watch(
  commonProblemVisible,
  async () => {
    if (!vm.$el) return
    await nextTick()
    const { height: listHeight } = vm.$el.getBoundingClientRect()
    const { height } = vm.$el.parentElement.getBoundingClientRect()
    const ChatDummyContainer = document.getElementById('ChatDummyContainer')
    if (!ChatDummyContainer) return
    const answerContainer = document.getElementById('KBAnswerContainer')
    if (!answerContainer) return
    const TourStep5 = document.getElementById('TourStep5')
    TourStep5 && (TourStep5.style.height = listHeight + 18 + 'px')
    if (commonProblemVisible.value) {
      ChatDummyContainer.style.height = 184 + 138 + 'px'
    } else {
      ChatDummyContainer.style.height = 184 + 'px'
    }
  },
  { immediate: true }
)

onMounted(() => {
  document.getElementById('__nuxt')?.addEventListener('click', onClose)
})
onBeforeUnmount(() => {
  document.getElementById('__nuxt')?.removeEventListener('click', onClose)
})
</script>
<style lang="less" module>
.chat-common-problem-open {
  bottom: 300px;
}
.common-problem-list {
  padding: 0 0 0 20px;
  visibility: hidden;
  height: 0;
  max-height: 144px;
  transition: all 0.3s;

  .common-problem-item:last-child {
    margin-bottom: 0;
  }
}

.common-problem-visible {
  margin-bottom: 12px;
  // height: 144px;
  height: auto;
  visibility: visible;
}

.common-problem-item {
  margin-bottom: 4px;
  display: flex;
  align-items: center;

  .problem-index {
    margin-right: 8px;
    width: 20px;
    font-size: 14px;
    font-weight: 400;
    color: #000000;
    line-height: 30px;
  }

  .problem-wrapper {
    width: calc(100% - 28px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    height: 30px;
    background: linear-gradient(270deg, #dae2f2 0%, #e6f1ff 53%, #dae8f2 100%);
    border-radius: 15px;
    backdrop-filter: blur(0px);
    cursor: pointer;
  }
  .problem-label {
    width: calc(100% - 12px);
    display: flex;
    align-items: center;

    font-size: 14px;
    font-weight: 400;
    color: #51565e;
    line-height: 18px;

    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: inline-block;
  }

  .problem-send {
    color: #3d7dff;
    width: 12px;
    height: 12px;
  }
}
</style>
