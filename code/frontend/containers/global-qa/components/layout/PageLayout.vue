<template>
  <div :class="$style['page-layout']">
    <PageHeader :class="$style['page-header']" />

    <!-- <div :class="$style['financial-bg']">
      <NuxtImg format="webp" src="/assets/images/financial/bg.jpg" sizes="1920px 1080px" />
    </div> -->
    <div :class="$style['page-container']">
      <slot />
    </div>
  </div>
</template>
<script lang="ts" setup>
import PageHeader from './PageHeader.vue'

defineProps({
  wrapperClass: {
    type: String
  }
})
</script>
<style lang="less" module>
.page-layout {
  position: relative;
  width: 100%;
  min-width: 1160px;
  height: 100vh;

  .financial-bg {
    position: absolute;
    left: 0;
    top: 0;
    z-index: -1;
    width: 100%;
    height: 100%;
    backdrop-filter: blur(29px);

    img {
      width: 100%;
      height: 100%;
    }
  }

  .page-container {
    height: calc(100% - 51px);
  }
}
</style>
