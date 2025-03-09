<template>
  <div :class="[$style['tour-step'], $style['tour-step-no-bg']]">
    <CloseOutlined :class="[$style['tour-close'], 'tour-close']" />
    <div :class="$style['tour-content']">
      <div :class="$style['tour-title']">向我提问</div>
      <div :class="$style['tour-desc-wrap']">
        <div :class="$style['tour-desc']">
          1. 输入你的问题，点击右下角的发送按钮，开始问答<br />
          2. 您可以要求我查询报告中信息、提取并分析报告内容
        </div>
        <div :class="$style['tour-step-bar']">
          <span :class="$style.active"> {{ Math.min(4, totalTourSteps) }}</span>
          /{{ totalTourSteps }}
        </div>
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
