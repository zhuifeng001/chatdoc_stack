<template>
  <div v-show="visible" class="page-text-container scroll-bar">
    <div class="page-text-item" v-for="page in pageList" :key="page.index" :data-page-index="page.index">
      {{ page.text }}
    </div>
  </div>
</template>
<script lang="ts">
import { type PropType, defineComponent, getCurrentInstance, nextTick, onMounted, onUnmounted, toRefs, watch } from 'vue'
import type { PageItem } from './types'
import { scrollChangePage } from '@/utils/util'
import { dataPageIndex } from './helper'

export default defineComponent({
  name: 'PageText',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    pageIndex: {
      type: Number,
      required: true
    },
    pageList: {
      type: Array as PropType<PageItem[]>,
      default: () => []
    }
  },
  setup(props) {
    const vm = getCurrentInstance()?.proxy as any
    const { pageIndex, visible } = toRefs(props)
    let disableScroll = false
    const commandPageIndex = e => {
      if (disableScroll) {
        disableScroll = false
        return
      }
      const activeNode = scrollChangePage(vm.$el, vm.$el.children)
      if (activeNode) {
        const pageIndex = activeNode.getAttribute(dataPageIndex)
        if (pageIndex) {
          vm.$emit('update:page-index', +pageIndex)
          vm.$emit('page-index-change', +pageIndex, true)
        }
      }
    }

    onMounted(() => {
      vm.$el.addEventListener('scroll', commandPageIndex)
    })

    onUnmounted(() => {
      vm.$el.removeEventListener('scroll', commandPageIndex)
    })

    watch([visible, pageIndex], async () => {
      if (!visible.value) return
      await nextTick()
      const pageTextNode = vm.$el?.querySelector(`[${dataPageIndex}="${pageIndex.value}"]`)
      if (!pageTextNode) return
      disableScroll = true
      pageTextNode.scrollIntoView({ block: 'start' })
    })

    return {}
  }
})
</script>
<style lang="less" scoped>
.page-text-container {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 10;

  padding: 0 10px 0 20px;
  background-color: #fff;
  overflow-y: scroll;
  overflow-x: hidden;

  .page-text-item {
    padding: 20px 0 20px 0;
    border-bottom: 1px solid #e4e4eb;
  }
}
</style>
