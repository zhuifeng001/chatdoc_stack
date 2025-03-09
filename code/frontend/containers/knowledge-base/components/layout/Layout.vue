<template>
  <a-layout class="layout">
    <LayoutHeader v-if="!noHeader" />
    <a-layout-content>
      <slot />
    </a-layout-content>
  </a-layout>
</template>

<script lang="ts" setup name="BasicLayout">
import LayoutHeader from './LayoutHeader.vue'

defineProps({
  noHeader: {
    type: Boolean,
    default: false
  }
})
</script>

<style lang="less" module>
.layout {
  height: 100%;
}
</style>
