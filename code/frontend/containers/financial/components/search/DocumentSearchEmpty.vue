<template>
  <div :class="$style['search-empty']">
    <NuxtImg
      format="webp"
      src="/assets/images/financial/SearchEmpty2.png"
      alt=""
      width="120px"
      height="120px"
      sizes="120px 120px"
    />
    <div :class="$style['search-empty-label']">很遗憾，没有找到您搜索的内容</div>
    <div :class="$style['search-empty-desc']">{{ subtitle || '您可以换其他关键词试试' }}</div>
  </div>
</template>
<script lang="ts" setup>
defineProps({
  subtitle: {
    type: String
  }
})
</script>
<style lang="less" module>
.search-empty {
  margin-top: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  &-label {
    margin: 20px 0 8px 0;
    font-size: 14px;
    font-weight: 500;
    color: #000000;
    line-height: 22px;
  }

  &-desc {
    text-align: center;
    font-size: 14px;
    font-weight: 400;
    color: #000000;
    line-height: 20px;
  }
}
</style>
