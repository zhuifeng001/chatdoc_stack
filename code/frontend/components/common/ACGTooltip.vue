<template>
  <a-tooltip v-model:open="visible" v-bind="$attrs">
    <template v-slot:title>
      <slot name="title" />
    </template>
    <slot />
  </a-tooltip>
</template>
<script lang="ts" setup>
import { ref, toRefs, watch } from 'vue'

const props = defineProps({
  duration: {
    type: Number,
    default: 2 // 秒
  }
})
const { duration } = toRefs(props)
const visible = ref(false)
watch(visible, () => {
  if (visible.value && duration.value !== 0) {
    setTimeout(() => {
      visible.value = false
    }, duration.value * 1000)
  }
})

onUnmounted(() => {
  visible.value = false
})
</script>
