<template>
  <VirtualList
    ref="VirtualListRef"
    :max-height="192"
    :item-height="32"
    :list="children"
    :item-component="KBDocumentWrapperItem"
    :extra-props="{ onCheckedChange, onActive }"
  />
</template>
<script lang="ts" setup>
import VirtualList from '@/components/common/VirtualList/index.vue'
import KBDocumentWrapperItem from './KBDocumentWrapperItem.vue'
import { getCurrentInstance, onMounted, reactive, type PropType, toRefs } from 'vue'

const vm = getCurrentInstance()?.proxy as any

const props = defineProps({
  treeData: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  children: {
    type: Array as PropType<any[]>,
    default: () => []
  }
})
const emit = defineEmits(['checked-change', 'select', 'active'])
const { children, treeData } = toRefs(props)

const VirtualListRef = ref()

watch(
  () => children.value.find(o => o._autoActive),
  async autoActiveItem => {
    if (!autoActiveItem?._autoActive) return
    const index = children.value.findIndex(o => o === autoActiveItem)
    if (!vm?.$el.querySelector(`[data-index="${index}"]`)) {
      await VirtualListRef.value?.scrollToIndex?.(index)
    }
    autoActiveItem._autoActive = false
  }
)

const onCheckedChange = source => {
  emit('checked-change', source)
}
const onActive = source => {
  emit('active', source)
}
</script>
