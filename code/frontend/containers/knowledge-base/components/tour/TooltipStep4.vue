<template>
  <div :class="[$style['tour-step'], $style['tour-step-no-bg']]">
    <CloseOutlined :class="[$style['tour-close'], 'tour-close']" />
    <div :class="$style['tour-content']">
      <div :class="$style['tour-title']">预览原件</div>
      <div :class="$style['tour-desc-wrap']">
        <div :class="$style['tour-desc']">
          1. 默认使用鼠标滚轮翻页、也可手动翻页 <br />
          2. 支持放大、缩小、适应页面及旋转 <br />
          3. 可通过关键词搜索文档内容
        </div>
        <div :class="$style['tour-step-bar']"><span :class="$style.active">2</span>/{{ totalTourSteps }}</div>
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
