<template>
  <div :class="[$style['source-file'], visible ? $style[`visible`] : '', active ? $style['active'] : '']">
    <img :class="$style['icon']" :src="pdfIcon" />
    <div :class="$style['wrapper']">
      <span :class="$style['name']" :title="doc.name">
        <span :class="$style['index']">{{ i + 1 }}.</span>
        {{ doc.name }}
      </span>
      <div :class="$style['time']">[{{ formatDate(doc.extraData?.financeDate, 'YYYY-MM-DD') }}]</div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { PropType } from 'vue'
import pdfIcon from '~/containers/global-qa/images/pdf-icon.png'
defineProps({
  doc: {
    type: Object as PropType<any>,
    required: true
  },
  i: {
    type: Number,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  }
})
const visible = ref(false)
onMounted(() => {
  setTimeout(() => {
    visible.value = true
  }, 300)
})
</script>
<style lang="less" module>
// 定义动画
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframe-duration: 0.5s;
@delay-increment: 0;

.source-file {
  margin-bottom: 10px;
  padding: 8px 6px 0 0;
  width: 296px;
  min-width: 200px;
  height: 70px;
  display: flex;
  align-items: flex-start;
  cursor: pointer;
  border-radius: 3px;
  color: #333;
  opacity: 0;

  animation: fadeIn @keyframe-duration ease-in-out;
  animation-delay: @delay-increment;

  &.visible {
    opacity: 1;
  }

  &.active,
  &:hover {
    background-image: linear-gradient(to top, #f3e7e9 0%, #e3eeff 99%, #e3eeff 100%);
    color: @primary-color;

    .wrapper {
      .index {
        color: @primary-color;
      }
    }
  }

  .icon {
    margin-right: 8px;
    width: 34px;
    height: 34px;
  }

  .wrapper {
    font-weight: 400;
    font-size: 13px;
    line-height: 17px;

    .index {
      color: #959ba6;
    }
    .name {
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-inline-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-all;
    }
    .time {
      white-space: nowrap;
    }
  }
}
</style>
