<template>
  <div class="page-text-item" :data-page-index="source.index">
    {{ source.text }}
  </div>
</template>
<script lang="ts">
import { type PropType, defineComponent } from 'vue'
import type { PageItem } from './types'

export default defineComponent({
  name: 'PageText',
  props: {
    index: {
      type: Number
    },
    source: {
      type: Object as PropType<PageItem>,
      default: () => ({})
    }
  }
})
</script>
<style lang="less" scoped>
.page-text-item {
  padding: 20px 0 20px 0;
  border-bottom: 1px solid #e4e4eb;
  text-align: left;
  white-space: pre;
}
</style>
