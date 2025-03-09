<template>
  <div
    class="virtual-list scroll-bar"
    @scroll="onScroll"
    :style="{ maxHeight: maxHeight == null ? '' : maxHeight + 'px' }"
  >
    <div class="virtual-list-wrapper" :style="{ height: actualWrapperHeight + 'px' }">
      <VirtualItem
        v-for="(item, i) in realList"
        :key="i + startIndex"
        :ref="'VirtualItemRef' + (i + startIndex)"
        :itemKey="itemKey"
        :itemAttrs="itemAttrs"
        :index="i + startIndex"
        :item="item"
        :list="list"
        :itemComponent="itemComponent"
        :top="itemPosInfoMap[i + startIndex]?.top"
        :extraProps="extraProps"
        @resize="onItemResizeChange"
        @mounted="onItemMounted(item, i + startIndex)"
      />
    </div>
  </div>
</template>
<script lang="ts">
import { getCurrentInstance, onMounted, reactive, toRefs, watch } from 'vue'
import { type PropType, computed, defineComponent, ref, watchEffect, nextTick } from 'vue'
import type { VirtualItemOptions } from './helper'
import { useResizeListener } from '@/utils/util'
import VirtualItem from './VirtualItem.vue'
import useEventEmitter from 'mitt'

export default defineComponent({
  components: {
    VirtualItem
  },
  props: {
    maxHeight: {
      type: Number
    },
    itemKey: {
      type: [String]
    },
    itemHeight: {
      type: Number
    },
    itemDefaultHeight: {
      type: Number
    },
    itemAttrs: {
      type: [Function, Object]
    },
    list: {
      type: Array as PropType<any[]>,
      default: () => []
    },
    itemComponent: {
      type: Object as PropType<any>
    },
    bufferCount: {
      type: Number,
      default: 2
    },
    visibleCount: {
      type: Number,
      default: 5
    },
    gap: {
      type: Number,
      default: 0
    },
    extraProps: {
      type: Object,
      default: () => ({})
    },
    disabledResize: {
      type: Boolean,
      default: false
    }
  },
  emits: ['scroll'],
  setup(props, { emit }) {
    const vm = getCurrentInstance()?.proxy as any

    // eslint-disable-next-line vue/no-setup-props-destructure
    const { gap } = props
    const { disabledResize, list, itemHeight, itemDefaultHeight, bufferCount, visibleCount } = toRefs(props)
    const index = ref(0)
    const startIndex = ref(0)
    const endIndex = ref(visibleCount.value + bufferCount.value)
    const realList = ref<any[]>(list.value.slice(startIndex.value, endIndex.value + 1))
    const actualWrapperHeight = ref(0)
    let wrapperNode: HTMLElement | null = null

    let averageHeight = 0
    const calcItemAverageHeight = () => {
      if (itemHeight.value) return itemHeight.value
      if (itemDefaultHeight.value) return itemDefaultHeight.value
      if (!vm.$el) return 0
      let totalHeight = 0
      const items = (vm.$el as HTMLElement).querySelectorAll(`.virtual-item`)
      let len = items.length
      items.forEach(node => {
        const { height } = node.getBoundingClientRect()
        totalHeight += height
      })
      return totalHeight / len
    }

    const genItemPosInfoMap = (list: any[]) => {
      averageHeight = calcItemAverageHeight()
      return Object.assign(
        {},
        ...list.map((o, i) => ({
          [i]: {
            index: i,
            top: i * averageHeight,
            height: averageHeight,
            bottom: (i + 1) * averageHeight,
            loaded: false
          }
        }))
      )
    }

    const itemPosInfoMap = ref<{ [key: number]: VirtualItemOptions }>(genItemPosInfoMap(list.value))

    const estimatedHeight = async () => {
      let totalHeight = 0
      for (let i = 0; i < list.value.length; i++) {
        if (i >= startIndex.value && i <= endIndex.value) {
          const childNodeRef = vm.$refs['VirtualItemRef' + i]?.[0]
          if (!childNodeRef) continue
          let childHeight = itemHeight.value as number
          if (childHeight == null) {
            childHeight = childNodeRef.getRect()?.height || 0
          }
          itemPosInfoMap.value[String(i)] = {
            index: i,
            top: totalHeight,
            height: childHeight,
            bottom: totalHeight + childHeight,
            loaded: !!childHeight // 标识 dom 已加载
          }

          totalHeight += childHeight + gap
          continue
        }
        totalHeight += itemPosInfoMap.value[i].height + gap
      }
      actualWrapperHeight.value = totalHeight
    }

    const getCurrentIndex = (scrollTop: number) => {
      let start = 0
      let end = list.value.length - 1
      let middle = 0

      while (start <= end) {
        middle = Math.floor((start + end) / 2)
        const item = itemPosInfoMap.value[middle]
        if (!item) continue

        if (scrollTop >= item.top && scrollTop < item.bottom) {
          return middle
        } else if (scrollTop < item.top) {
          end = middle - 1
        } else {
          start = middle + 1
        }
      }
      return middle
    }

    let disabledScroll = false
    const stopScrollEvent = () => {
      disabledScroll = true
      setTimeout(() => {
        disabledScroll = false
      }, 100)
    }
    const onScroll = e => {
      if (disabledScroll) {
        return false
      }
      if (e.target !== vm.$el) return
      const scrollTop = e.target.scrollTop
      index.value = getCurrentIndex(scrollTop)

      emit('scroll')
    }

    const scrollToIndex = async (i: number) => {
      const scrollTo = () => {
        if (!wrapperNode) return
        stopScrollEvent()
        wrapperNode.scrollTop = itemPosInfoMap.value[i].top
        // const targetNode: HTMLElement = vm.$el.querySelector(`[data-index="${i}"]`);
        // targetNode?.scrollIntoView({ block: 'start', behavior: 'auto' });
      }

      // item 已加载过，可以立即跳转
      if (itemPosInfoMap.value[i].loaded) {
        index.value = i
        scrollTo()
        return
      }

      return new Promise(resolve => {
        eventBus.on(`itemLoaded-${i}`, () => {
          scrollTo()
          eventBus.off(`itemLoaded-${i}`)
          resolve(void 0)
        })
        index.value = i
      })
    }

    const onItemResizeChange = (index: number, item: any) => {
      estimatedHeight()
    }

    const itemLoadedMap = new Map<number, boolean>()
    const eventBus = useEventEmitter()
    const onItemMounted = (item: any, i: number) => {
      itemLoadedMap.set(i, true)
      eventBus.emit(`itemLoaded-${i}`)
    }

    watch(
      () => list.value.length,
      () => {
        itemPosInfoMap.value = genItemPosInfoMap(list.value)
      }
    )

    watchEffect(async () => {
      // bufferSize + visibleCount + bufferSize
      startIndex.value = Math.max(0, index.value - bufferCount.value)
      endIndex.value = Math.min(list.value.length - 1, index.value + visibleCount.value + bufferCount.value)
      realList.value = list.value.slice(startIndex.value, endIndex.value + 1)

      await nextTick()
      estimatedHeight()
    })

    onMounted(() => {
      wrapperNode = vm.$el as HTMLElement
      // wrapperNode.style.height = wrapperNode.parentElement?.clientHeight + 'px'
      // itemPosInfoMap.value = genItemPosInfoMap(list)

      useResizeListener(vm.$el, () => {
        estimatedHeight()
      })
    })

    return {
      actualWrapperHeight,
      startIndex,
      index,
      realList,
      itemPosInfoMap,
      onScroll,
      scrollToIndex,
      onItemResizeChange,
      onItemMounted
    }
  }
})
</script>
<style lang="less" scoped>
.virtual-list {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;

  .virtual-list-wrapper {
    position: relative;
  }
}
</style>
