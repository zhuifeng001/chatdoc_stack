<template>
  <div
    ref="DomRef"
    class="virtual-item"
    :key="itemKey ? item[itemKey] : index"
    :data-index="index"
    :style="{ position: 'absolute', left: 0, top: `${top}px` }"
  >
    <component :is="itemComponent" :index="index" :source="item" v-bind="{ ...formatAttrs?.(), ...(extraProps || {}) }"></component>
  </div>
</template>
<script lang="ts">
// 开启拖拽，不支持 translate3d
// <!-- transform: `translate3d(0, ${top}px, 0)` -->
import { type Component, type PropType, defineComponent, onBeforeUnmount, onMounted, ref } from 'vue'

export type ComponentProps = {
  style?: Record<string, string | number>
  source: any
  index: number
}

interface Props {
  itemKey?: string
  index: number
  item: any
  top: number
  extraProps?: Record<string, any>
  Component: Component<ComponentProps>
  onResizeChange: (index: number, item: any, entries?: ResizeObserverEntry[]) => void
}

export default defineComponent({
  props: {
    itemKey: {
      type: String
    },
    index: {
      type: Number,
      required: true
    },
    item: {
      type: Object,
      required: true
    },
    list: {
      type: Array,
      required: true
    },
    top: {
      type: Number
    },
    itemAttrs: {
      type: [Function, Object]
    },
    extraProps: {
      type: Object,
      default: () => ({})
    },
    itemComponent: {
      type: Object as PropType<Component<ComponentProps>>,
      required: true
    }
  },
  emits: ['resize', 'mounted'],
  setup(props, { emit }) {
    // eslint-disable-next-line vue/no-setup-props-destructure
    const { index, item, itemAttrs, itemKey } = props
    const DomRef = ref<HTMLElement>()
    const observer = ref<ResizeObserver>()

    const formatAttrs = () => {
      return (typeof itemAttrs === 'function' ? itemAttrs(item, index) : itemAttrs) || {}
    }

    const getRect = () => {
      return DomRef.value?.getBoundingClientRect()
    }

    let prevWidth = 0
    let prevHeight = 0
    let first = true
    const fn = function (entries: ResizeObserverEntry[]) {
      const current = entries[0].target
      if (!current) return
      const currWidth = current.clientWidth
      const currHeight = current.clientHeight
      if (first || prevWidth !== currWidth || prevHeight !== currHeight) {
        if (entries[0]?.target !== DomRef.value?.childNodes[0]) {
          destroyObserver()
          initObserver()
          return
        }
        emit('resize', index, item, entries)
        first = false
      }
      prevWidth = currWidth
      prevHeight = currHeight
    }

    const initObserver = () => {
      if (!DomRef.value) return
      prevWidth = DomRef.value.clientWidth
      prevHeight = DomRef.value.clientHeight
      const node = DomRef.value.childNodes[0] as HTMLElement
      observer.value = new ResizeObserver(fn)
      node && observer.value.observe(node)
    }

    const destroyObserver = () => {
      first = true
      if (!DomRef.value) return
      const node = DomRef.value.childNodes[0] as HTMLElement
      node && observer.value?.unobserve(node)
      observer.value?.disconnect()
    }

    onMounted(() => {
      initObserver()
      // 等待子组件加载完成
      setTimeout(() => {
        emit('mounted')
      })
    })

    onBeforeUnmount(() => {})

    return {
      DomRef,
      getRect,
      formatAttrs
    }
  }
})
</script>
<style lang="less" scoped>
.virtual-item {
  width: 100%;
  will-change: top;
}
</style>
