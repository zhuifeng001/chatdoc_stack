<template>
  <div :class="[$style['kb-answer-container'], 'chat-answer-content', 'scroll-bar']" id="DocumentSummaryContainer">
    {{ currentSummary || '暂无总结~' }}
  </div>
</template>
<script lang="ts" setup>
import { useTypewriter } from '~/libs/useTypewriter'
import { useKBStore } from '../../store'

const store = useKBStore()
const { currentSummary } = storeToRefs(store)

watch(currentSummary, () => {
  useTypewriter({
    selector: document.getElementById('DocumentSummaryContainer') as HTMLElement,
    parentSelector: document.getElementById('DocumentSummaryContainer') as HTMLElement,
    md: true,
    string: currentSummary.value,
    speed: 40,
    immediate: true,
    random: true,
    autoScroll: true,
    markerStyles: {
      background: '#1A66FF'
    }
  })
})
</script>
<style lang="less" module>
.kb-answer-container {
  position: relative;
  padding: 52px 20px 168px;
  width: 100%;
  height: 100%;
  flex-shrink: 0;
  overflow: auto;
  transition: all 0.3s;
  overflow-x: hidden;
  // white-space: pre-wrap;

  line-height: 26px;

  :global {
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      font-size: 16px;
      margin: 3px 0 0;
    }
  }
}
</style>
