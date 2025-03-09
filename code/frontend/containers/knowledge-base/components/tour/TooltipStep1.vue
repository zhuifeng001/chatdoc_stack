<template>
  <div :class="$style['tour-step']">
    <CloseOutlined :class="[$style['tour-close'], 'tour-close']" />
    <div :class="$style['tour-img']">
      <img src="./images/tour-banner-1.png" alt="" />
    </div>
    <div :class="$style['tour-content']">
      <!-- <div :class="$style['tour-step-bar']"><span :class="$style.active">1</span>/6</div> -->
      <div :class="$style['tour-title']">从知识库提取文件</div>
      <div :class="$style['tour-desc']">
        1. 搜索知识库报告并添加至列表中 <br />
        2. 已添加的文件，默认归类至“知识库文件”
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import CloseOutlined from '../../images/CloseOutlined.vue'
</script>
<style lang="less" module>
@import './styles/index.less';
</style>
