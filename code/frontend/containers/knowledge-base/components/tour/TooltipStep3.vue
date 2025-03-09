<template>
  <div :class="$style['tour-step']">
    <CloseOutlined :class="[$style['tour-close'], 'tour-close']" />
    <div :class="$style['tour-img']">
      <img src="./images/tour-banner-3.png" alt="" />
    </div>
    <div :class="$style['tour-content']">
      <div :class="$style['tour-step-bar']"><span :class="$style.active">1</span>/{{ totalTourSteps }}</div>
      <div :class="$style['tour-title']">查看文档目录</div>
      <div :class="$style['tour-desc']">
        1. 可切换目录形式或折叠 <br />
        2. 单击“目录”可将其折叠/展开
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import CloseOutlined from '../../images/CloseOutlined.vue'
import { useTour } from '../../store/useTour'
const tourStore = useTour()
const { totalTourSteps } = storeToRefs(tourStore)
</script>
<style lang="less" module>
@import './styles/index.less';
</style>
