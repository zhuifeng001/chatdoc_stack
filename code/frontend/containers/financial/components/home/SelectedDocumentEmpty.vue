<template>
  <div :class="$style['search-empty']">
    <NuxtImg
      src="/assets/images/financial/SearchEmpty.png"
      format="webp"
      alt=""
      width="120px"
      height="120px"
      sizes="120px 120px"
    />
    <div :class="$style['search-empty-label']">你还没有选择报告</div>
    <div :class="$style['search-empty-desc']">去列表中添加吧</div>
  </div>
</template>
<script lang="ts" setup>
import { storeToRefs } from 'pinia'
</script>
<style lang="less" module>
.search-empty {
  margin-top: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  &-label {
    margin: 20px 0 0 0;
    font-size: 14px;
    font-weight: 500;
    color: #000000;
    line-height: 24px;
  }

  &-desc {
    text-align: center;
    font-size: 14px;
    font-weight: 400;
    color: #858c99;
    line-height: 20px;
  }
}
</style>
