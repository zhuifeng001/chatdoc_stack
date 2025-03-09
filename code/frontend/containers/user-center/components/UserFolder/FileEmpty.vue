<script setup lang="ts">
const props = defineProps({
  emptyText: {
    type: String
  }
})
</script>

<template>
  <div :class="$style['empty-box']">
    <NuxtImg
      format="webp"
      src="/assets/images/financial/SearchEmpty.png"
      alt=""
      width="120px"
      height="120px"
      sizes="120px 120px"
    />
    <div :class="$style['search-empty-label']">
      {{ props.emptyText || '暂无数据' }}
    </div>
  </div>
</template>
<style lang="less" module>
.empty-box {
  width: 100%;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-box {
  flex-direction: column;
  color: var(--text-gray-color);
}
</style>
