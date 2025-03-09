<template>
  <VirtualList ref="pageTextListRef" id="page-text-list" class="page-text-container scroll-bar" item-key="index" :list="pageList" :item-component="PageTextItem" />
</template>
<script lang="ts">
import { type PropType, defineComponent, getCurrentInstance, nextTick, onMounted, onUnmounted, ref, toRefs, watch } from 'vue'
import PageTextItem from './PageTextItem.vue'
import type { PageItem } from './types'
import { dataPageIndex } from './helper'
import { scrollChangePage } from '@/utils/util'
import VirtualList from '@/components/common/VirtualList/index.vue'

export default defineComponent({
  components: {
    VirtualList
  },
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
    const pageTextListRef = ref()

    let disableScroll = false
    let disableSetScroll = false

    const stopDisableScroll = () => {
      disableScroll = true
      setTimeout(() => {
        disableScroll = false
      }, 100)
    }
    const stopDisableSetScroll = () => {
      disableSetScroll = true
      setTimeout(() => {
        disableSetScroll = false
      }, 100)
    }

    let pageTextListWrapper: HTMLElement
    let pageTextListNode: HTMLElement

    const commandPageIndex = e => {
      if (disableScroll) {
        return
      }
      const activeNode = scrollChangePage(pageTextListWrapper, pageTextListNode)
      if (activeNode) {
        const pageIndex = activeNode.querySelector('.page-text-item')?.getAttribute(dataPageIndex)
        if (pageIndex) {
          stopDisableSetScroll()
          vm.$emit('update:page-index', +pageIndex)
          vm.$emit('page-index-change', +pageIndex, true)
        }
      }
    }

    onMounted(() => {
      pageTextListWrapper = vm.$el
      pageTextListNode = vm.$el.querySelector('.virtual-list-wrapper')
      pageTextListWrapper.addEventListener('scroll', commandPageIndex)
    })

    onUnmounted(() => {
      pageTextListWrapper.removeEventListener('scroll', commandPageIndex)
    })

    watch([visible, pageIndex], async () => {
      if (disableSetScroll || !visible.value) {
        return
      }
      await nextTick()
      stopDisableScroll()
      pageTextListRef.value.scrollToIndex(pageIndex.value - 1)
    })

    return {
      pageTextListRef,
      PageTextItem
    }
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
