<template>
  <div :class="$style['chat-guide-start']">{{ content }}</div>
</template>
<script lang="ts" setup>
defineProps({
  content: {
    type: String,
    required: true
  }
})
</script>
<style lang="less" module>
.chat-guide-start {
  font-weight: 400;
  color: #000000;
  line-height: 20px;
}
</style>
