<template>
  <div :class="$style['tour-step']">
    <CloseOutlined :class="[$style['tour-close'], 'tour-close']" />
    <div :class="$style['tour-img']">
      <img src="./images/tour-banner-2.png" alt="" />
    </div>
    <div :class="$style['tour-content']">
      <div :class="$style['tour-step-bar']"><span :class="$style.active">1</span>/5</div>
      <div :class="$style['tour-title']">管理文件列表</div>
      <div :class="$style['tour-desc']">
        1. 可将文件拖拽到此处上传，或点击下方按钮 <br />
        2. 可使用文件夹管理文件，双击自定义名称 <br />
        3. 点击“多选”开启批量管理和多文档问答
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
