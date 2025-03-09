<template>
  <a-pagination
    :class="$style['pagination']"
    v-bind="pagination"
    @change="onChange"
    @showSizeChange="onShowSizeChange"
  />
</template>
<script lang="ts" setup>
import { getCurrentInstance, onMounted, watch, reactive, toRefs, nextTick } from 'vue'
import { getDefaultPaginationConfig } from './helper'

const props = defineProps({
  current: {
    type: Number,
    default: 1
  },
  pageSize: {
    type: Number,
    default: 10
  },
  total: {
    type: Number,
    default: 0
  }
})
const emit = defineEmits(['change'])
const pagination = reactive({
  ...getDefaultPaginationConfig()
})
const { current, pageSize, total } = toRefs(props)

function onChange(current: number, pageSize: number) {
  pagination.current = current
  pagination.pageSize = pageSize
  emit('change', current, pageSize)
}
function onShowSizeChange(current: number, pageSize: number) {
  // console.log('2 :>> ', 2)
  // pagination.current = current
  // pagination.pageSize = pageSize
  // emit('change', current, pageSize)
}

watch(
  current,
  () => {
    pagination.current = current.value
  },
  { immediate: true }
)
watch(
  total,
  () => {
    pagination.total = total.value
  },
  { immediate: true }
)
watch(
  pageSize,
  () => {
    pagination.pageSize = pageSize.value
  },
  { immediate: true }
)

const vm = getCurrentInstance()?.proxy as any
onMounted(() => {
  nextTick(() => {
    // 文字修改，跳至 ==> 前往
    const node = vm.$el.querySelector('.ant-pagination-options-quick-jumper')
    node?.childNodes?.[0] && (node.childNodes[0].nodeValue = '前往')
  })
})
</script>
<style lang="less" module>
.pagination {
  display: flex;

  :global(.ant-pagination-total-text) {
    flex: 1;
  }
}
</style>
