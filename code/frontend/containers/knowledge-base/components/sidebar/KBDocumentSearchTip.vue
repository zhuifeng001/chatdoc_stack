<template>
  <div v-if="show" class="doc-search-tip">
    <div class="doc-search-tip-title">💡&nbsp;提示</div>
    <!-- <div class="doc-search-tip-line">
      请输入搜索关键词，按
      <span class="doc-search-tip-highlight">Enter回车键</span>
      完成搜索。
    </div> -->
    <div class="doc-search-tip-line">
      {{ isFinancialKB ? '从财经知识库中搜索您关注的公司报告' : '从知识库中搜索文档' }}
    </div>
    <div class="doc-search-tip-line">
      多个搜索词请用
      <span class="doc-search-tip-highlight">{{ delimiter }}</span>
      连接，例如：
      <span class="doc-search-tip-highlight">企业名称{{ delimiter }}报告{{ delimiter }}2023年</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import { onBeforeUnmount, onMounted, ref, toRefs, watch } from 'vue'
import { useKBStore } from '../../store'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  delimiter: {
    type: String,
    default: '&'
  }
})
const { visible } = toRefs(props)
const emit = defineEmits(['close'])

const { isFinancialKB } = storeToRefs(useKBStore())

const show = ref(false)
watch(visible, () => {
  show.value = visible.value
})

onMounted(() => {
  document.body.addEventListener('keydown', listenKeydown)
})
onBeforeUnmount(() => {
  document.body.removeEventListener('keydown', listenKeydown)
})
function listenKeydown(e) {
  // 按下 ESC 键
  if (e.key === 'Escape' || e.keyCode === 27) {
    show.value = false
    emit('close')
  }
}
</script>

<style lang="less" scoped>
.doc-search-tip {
  position: absolute;
  left: 20px;
  top: calc(100% - 8px);
  padding: 10px 12px;
  background: #475266;
  box-shadow: 0px 6px 18px 0px rgba(3, 10, 26, 0.12);
  border-radius: 4px;
  color: #fff;
  z-index: 2010;

  &-line {
    padding: 12px 0;
    white-space: nowrap;

    &:last-child {
      padding-bottom: 6px;
      border-top: 1px solid rgba(225, 228, 235, 0.2);
    }
  }

  &-highlight {
    padding: 1px 4px;
    background: #f2f4f7;
    border-radius: 2px;
    border: 1px solid #e1e4eb;

    font-size: 12px;
    font-weight: 400;
    color: #51565e;
    line-height: 18px;
  }
}
</style>
