<template>
  <acg-tooltip overlayClassName="acg-tooltip" :title="props.title" :open="ellipsis ? undefined : false">
    <a-typography-text
      :class="$style['ellipsis-box']"
      :ellipsis="{ tooltip: false, onEllipsis }"
      :content="props.title"
    >
    </a-typography-text>
  </acg-tooltip>
</template>
<script setup>
const props = defineProps(['title'])
const ellipsis = ref(false)

const onEllipsis = e => {
  ellipsis.value = true
}
</script>
<style lang="less" module>
.ellipsis-box {
  line-height: 16px;
  height: 16px;
  color: inherit;
}
</style>
