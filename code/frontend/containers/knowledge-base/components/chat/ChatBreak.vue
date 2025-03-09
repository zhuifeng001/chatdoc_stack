<template>
  <div :class="$style['chat-break-wrapper']" :style="{ top: `${top}`, bottom: `${bottom}` }">
    <StopOutlined :class="[$style['chat-stop-icon']]" />
    <span>停止生成</span>
  </div>
</template>
<script setup lang="ts">
import StopOutlined from '../../images/StopOutlined.vue'
defineProps({
  top: {
    type: [Number, String]
  },
  bottom: {
    type: [Number, String]
  }
})
</script>
<style lang="less" module>
.chat-break-wrapper {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 30px;

  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0px 0px 8px 0px rgba(192, 196, 204, 0.31), -2px -2px 12px 0px rgba(255, 255, 255, 0.74);

  .chat-stop-icon {
    margin-right: 6px;
    width: 20px;
    height: 20px;
    cursor: pointer;
  }
  &:hover {
    opacity: 0.85;
    color: var(--primary-color);
  }
}
</style>
