<template>
  <div :class="$style['page-header']">
    <NuxtLink :class="$style['page-header-left']" to="/">
      <NuxtImg src="/logo.png" alt="" format="webp" width="108px" height="30px" />
      <!-- <span :class="$style['kb-name']">财经知识库</span> -->
    </NuxtLink>
    <div :class="$style['page-header-right']">
      <ClientOnly>
        <LayoutHeaderUser />
      </ClientOnly>
    </div>
  </div>
</template>
<script lang="ts" setup>
import LayoutHeaderUser from '@/containers/knowledge-base/components/layout/LayoutHeaderUser.vue'
</script>
<style lang="less" module>
.page-header {
  padding: 0 20px;
  width: 100%;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .page-header-left {
    display: flex;
    align-items: center;
  }

  .kb-name {
    margin-left: 10px;
    font-size: 18px;
    font-weight: 600;
    color: #000;
    line-height: 18px;
  }
}
</style>
