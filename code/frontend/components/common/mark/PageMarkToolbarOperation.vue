<template>
  <a-space alignment="center" :size="'small'" direction="horizontal" class="operation" :class="{ disabled }">
    <span class="opt reduce">
      <a-popover
        placement="bottom"
        overlayClassName="acg-popover"
        :content="`缩小：${altOrOption} + 滚轮`"
        :disabled="disabled || imgScale <= minScale"
      >
        <ZoomOutOutlined :class="{ disabled: imgScale <= minScale }" @click="setScale(-radio)"></ZoomOutOutlined>
      </a-popover>
    </span>
    <span class="opt enlarge">
      <a-popover
        placement="bottom"
        overlayClassName="acg-popover"
        :content="`放大：${altOrOption} + 滚轮`"
        :disabled="disabled || imgScale >= maxScale"
      >
        <ZoomInOutlined :class="{ disabled: imgScale >= maxScale }" @click="setScale(radio)"></ZoomInOutlined>
      </a-popover>
    </span>
    <span class="opt" :class="{ default: modeState === 'default', reset: modeState === 'max-height' }">
      <a-popover
        placement="bottom"
        overlayClassName="acg-popover"
        :content="modeState === 'default' ? '还原' : '适应页面'"
        :disabled="disabled"
      >
        <PageFullOutlined v-if="modeState === 'default'" @click="setDefaultMark" />
        <PageFitWidthOutlined v-else @click="setMaxMark" />
      </a-popover>
    </span>
    <span class="opt">
      <a-popover placement="bottom" overlayClassName="acg-popover" content="旋转" :disabled="disabled">
        <RotateRightOutlined @click="rotateMark"></RotateRightOutlined>
      </a-popover>
    </span>
    <!-- <span class="opt">
      <a-popover placement="bottom" overlayClassName="acg-popover" content="下载" :disabled="disabled">
        <DownloadOutlined @click="downloadFile"></DownloadOutlined>
      </a-popover>
    </span> -->
    <slot name="extension" />
  </a-space>
</template>
<script lang="ts" setup>
import { MAX_SCALE, MIN_SCALE } from './helper'
import { isMac } from '@/utils/device'
import { useInject } from '@/hooks/useInject'
import type { MarkInstance, RenderMode } from '@intsig/canvas-mark'
import PageFitWidthOutlined from './images/PageFitWidthOutlined.vue'
import PageFullOutlined from './images/PageFullOutlined.vue'
import ZoomInOutlined from './images/ZoomInOutlined.vue'
import ZoomOutOutlined from './images/ZoomOutOutlined.vue'
import RotateRightOutlined from './images/RotateRightOutlined.vue'
import DownloadOutlined from './images/DownloadOutlined.vue'
import type { Ref } from 'vue'

const imgScale = 1
const minScale = MIN_SCALE
const maxScale = MAX_SCALE
const altOrOption = isMac ? 'OPTION' : 'ALT'
const props = defineProps({
  radio: {
    type: Number,
    default: 0.1
  },
  scale: {
    type: Number,
    default: 1
  },
  disabled: {
    type: Boolean,
    default: false
  },
  hideDrag: {
    type: Boolean,
    default: false
  }
})
const emit = defineEmits(['download'])
const { getMarkInstance, modeState }: { getMarkInstance: () => MarkInstance; modeState: Ref<RenderMode> } = useInject([
  'getMarkInstance',
  'modeState'
])

function setScale(radio: number) {
  getMarkInstance()?.setScaleByRadio(radio)
}
function setDefaultMark() {
  modeState.value = 'max-height'
  getMarkInstance()?.setMode('max-height')
}
function setMaxMark() {
  modeState.value = 'default'
  getMarkInstance()?.setMode('default')
}
function rotateMark() {
  getMarkInstance()?.rotate()
}
function downloadFile() {
  emit('download')
}
</script>

<style lang="less" scoped>
.operation {
  user-select: none;
  span.opt {
    display: flex;
    width: 20px;
    align-items: center;

    :deep(svg) {
      display: block;
      width: 20px;
      height: 20px;
      cursor: pointer;
      outline: none;

      &:hover {
        path:last-child {
          fill: var(--primary-color);
        }
      }
    }

    &.default,
    &.reset {
      :deep(svg) {
        &:hover {
          path:nth-of-type(2),
          path:nth-of-type(3) {
            fill: var(--primary-color);
          }
        }
      }
    }
  }
}
</style>
