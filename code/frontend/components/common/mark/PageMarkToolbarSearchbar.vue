<template>
  <div class="mark-search-bar" @mouseleave="clearHoverPage">
    <div
      class="mark-search-bar-line"
      v-for="line in markSearchResults"
      :key="line.page"
      :class="[`SearchbarLine-${line.page}`, hoverPage === line.page ? 'active' : '']"
      :style="{ transform: `translate3d(0, ${(line.page - 0.5) * pageHeight - 1.5}px, 0)`, visibility: line.active ? 'visible' : 'hidden' }"
      @mouseenter="onHoverLine(line)"
      @mousedown="onSelect(line.page)"
    >
      <div class="mark-search-bar-chunk"></div>
    </div>
    <div v-show="hoverPage > 0" class="mark-search-bar-page" :style="{ top: hoverPageTop + 'px' }" @click.stop="onSelect(hoverPage)">
      <span>{{ hoverPage }}</span>
      <svg viewBox="0 0 42 22" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="Gradient2" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stop-color="#e5eaf2" />
            <stop offset="100%" stop-color="#f5f8fc" />
          </linearGradient>
        </defs>
        <path
          d="M26 1 L 30 1 Q 31 1, 32 2 L 41 10 Q 42 11, 41 12 L 32 20 Q 31 21, 30 21 L 26 21 L 5 21 Q 1 21, 1 17 L 1 4 Q 1 1, 5 1 Z"
          stroke="#fff"
          stroke-width="1"
          fill="url(#Gradient2)"
        />
      </svg>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useInject } from '@/hooks/useInject'
import { useResizeListener } from '@/utils/util'
import { getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { MarkSearchLine } from './helper'

const { PageMarkRef, pageList, markSearchResults } = useInject(['PageMarkRef', 'pageList', 'markSearchResults'])

const onSelect = (page: number) => {
  PageMarkRef.value.changePage(page)
}

const pageHeight = ref(0)

const vm = getCurrentInstance()?.proxy as any
let containerResizeDestroy = undefined as any

const updatePageHeight = () => {
  if (!vm.$el) return
  const containerHeight = vm.$el.clientHeight
  pageHeight.value = containerHeight / pageList.value.length
}

watch(pageList, () => {
  updatePageHeight()
})

const hoverPage = ref(0)
const hoverPageTop = ref(0)
const clearHoverPage = () => {
  hoverPage.value = 0
}
const onHoverLine = (line: MarkSearchLine) => {
  hoverPage.value = line.page
  getTop()
}
const getTop = async () => {
  if (hoverPage.value === 0) return
  if (!vm.$el || vm.$el.nodeName === '#comment') return
  const node = vm.$el?.querySelector('.mark-search-bar-page') as HTMLElement
  if (!node) return null
  const lineNode = vm.$el.querySelector(`.SearchbarLine-${hoverPage.value}`)
  if (!lineNode) return null
  const parentRect = (vm.$el as HTMLElement).getBoundingClientRect()
  const lineRect = lineNode.getBoundingClientRect()
  const nodeRect = node.getBoundingClientRect()
  hoverPageTop.value = lineRect.top - parentRect.top - 10
  await nextTick()
  // 最顶部
  if (node.offsetTop < 0) {
    hoverPageTop.value = hoverPageTop.value - node.offsetTop
  }
  // 最底部
  if (node.offsetTop + nodeRect.height > parentRect.height) {
    hoverPageTop.value = hoverPageTop.value - (node.offsetTop + nodeRect.height - parentRect.height)
  }
}

onMounted(() => {
  containerResizeDestroy = useResizeListener(vm.$el, updatePageHeight, { enableFrame: true })
})

onBeforeUnmount(() => {
  containerResizeDestroy?.()
  containerResizeDestroy = null
})
</script>
<style lang="less" scoped>
.mark-search-bar {
  position: absolute;
  top: 0;
  right: 0;
  width: 12px;
  height: 100%;
  z-index: 1;
  background-color: rgba(200, 200, 200, 0.2);

  .mark-search-bar-line {
    position: absolute;
    top: 0;
    right: 0;

    cursor: pointer;

    .mark-search-bar-chunk {
      width: 12px;
      height: 3px;
      background: rgba(26, 102, 255, 0.2);
      border: 1px solid #1a66ff;
      transition: width 0.1s;
    }

    &.active,
    &:hover {
      .mark-search-bar-chunk {
        width: 20px;
        background: #1a66ff;
      }

      .mark-search-bar-page {
        display: flex;
      }
    }
  }

  @gap: 2px;
  .mark-search-bar-page {
    transform-origin: right;
    position: absolute;
    top: -10px;
    right: 20px;
    padding-right: @gap;
    width: calc(42px + @gap);
    height: 22px;

    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    // display: none;

    svg {
      // box-shadow: 0px 4px 12px 0px rgba(6, 6, 26, 0.1), 0px 0px 20px -15px rgba(19, 18, 60, 0.14);
      position: absolute;
      top: 0;
      right: @gap;
      width: 42px;
      height: 22px;
      color: #fff;
    }

    span {
      position: relative;
      z-index: 1;
      margin-right: 10px;
      font-size: 12px;
      font-weight: 400;
      color: #51565e;
      line-height: 16px;
      user-select: none;
    }
  }
}
</style>
