<template>
  <div :class="[$style['tour-step'], $style['tour-step-no-bg']]">
    <CloseOutlined :class="[$style['tour-close'], 'tour-close']" />
    <div :class="$style['tour-content']">
      <div :class="$style['tour-title']">建议问题</div>
      <div :class="$style['tour-desc-wrap']">
        <div :class="$style['tour-desc']">
          根据文件内容自动生成 4 个高度相关的问题。<br />
          您可以单击您感兴趣的问题并获得即时回复。
        </div>
        <div :class="$style['tour-step-bar']"><span :class="$style.active">3</span>/{{ totalTourSteps }}</div>
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
