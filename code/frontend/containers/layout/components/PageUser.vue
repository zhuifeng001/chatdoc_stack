<script setup lang="ts">
import LayoutHeaderUser from '@/containers/knowledge-base/components/layout/LayoutHeaderUser.vue'
const route = useRoute()
const isHome = route.path === '/financial'
</script>
<template>
  <div :class="$style['page-user']">
    <ClientOnly>
      <LayoutHeaderUser />
    </ClientOnly>
  </div>
</template>
<style lang="less" module>
.page-user {
  position: absolute;
  right: 20px;
  top: 16px;
  z-index: 5;
}
</style>
