<template>
  <div class="mark-container"></div>
</template>

<script lang="ts" setup>
import { type PropType, getCurrentInstance, onBeforeUnmount, onMounted, ref, toRefs } from 'vue'
import { type MarkInstance, type RenderMode, createMark, type MarkOptions } from '@intsig/canvas-mark'
import { useResizeListener } from '@/utils/util'
import type { PageItem } from './types'
import type { Func } from '@/types'
import { useInject } from '@/hooks/useInject'

const styles = useCssModule()

const props = defineProps({
  options: {
    type: Object as PropType<Partial<MarkOptions>>,
    default: () => ({})
  },
  pages: {
    type: Array as PropType<PageItem[]>,
    default: () => []
  },
  pageIndex: {
    type: Number,
    default: 1
  },
  getLocation: {
    type: Function as PropType<(pageItem: any) => any>
  }
})
const emit = defineEmits([
  'update:page-index',
  'change-page',
  'mark-hover',
  'mark-leave',
  'mark-click',
  'mark-right-click',
  'mark-complete',
  'mark-change',
  'translate-change',
  'scale-change',
  'scroll',
  'drag',
  'mode-change',
  'image-loading',
  'image-loaded',
  'init',
  'resize'
])
const vm = getCurrentInstance()?.proxy as any
// eslint-disable-next-line vue/no-setup-props-destructure
const { options, pages, getLocation } = props
const { pageIndex } = toRefs(props)
const instance = { value: null as MarkInstance | null }
let containerResizeDestroy: Func | undefined
const loading = ref(false)

const { modeState } = useInject(['modeState'])

function onDevicePixelRatioChange(callback) {
  let lastDevicePixelRatio = window.devicePixelRatio
  let isCallbackFired = false // 标记回调是否已经触发过

  function checkDevicePixelRatio() {
    if (!isCallbackFired && window.devicePixelRatio !== lastDevicePixelRatio) {
      callback(window.devicePixelRatio)
      lastDevicePixelRatio = window.devicePixelRatio
      isCallbackFired = true
      // 设置一个定时器来重置 isCallbackFired
      setTimeout(() => {
        isCallbackFired = false
      }, 500) // 这个延迟可以根据需要进行调整
    }
  }

  // 添加 resize 事件监听器
  window.addEventListener('resize', checkDevicePixelRatio)

  // 返回一个函数用于移除监听器
  return () => {
    window.removeEventListener('resize', checkDevicePixelRatio)
  }
}

// 使用示例
let removeListener: Func | undefined

// 如果你想在以后移除监听器
// removeListener();

let initialized = false
const initMark = () => {
  instance.value = createMark({
    selector: vm.$el,
    pages: pages,
    multiple: true,
    margin: 12,
    padding: 0,
    gap: 8,
    preloadImageNum: 5,
    modeOfMaxHeightOptions: { scrollTop: 44 },
    backgroundColor: '#E1E4EB',
    // backgroundImageBorder: {
    //   strokeStyle: '#D76365',
    //   lineWidth: 1
    // },
    scrollbarVerticalClassName: [styles['mark-scroll-bar'], styles['mark-scroll-bar-vertical']],
    scrollbarHorizontalClassName: [styles['mark-scroll-bar'], styles['mark-scroll-bar-horizontal']],
    enableWorker: true,
    ...options,
    getLocation,
    onChangePage(i: number, pageItem: any) {
      emit('update:page-index', i)
      emit('change-page', i)
    },
    onContainerSizeChange() {},
    onScroll(newV, oldV) {
      emit('scroll', newV, oldV)
    },
    onDrag(newV, oldV) {
      emit('drag', newV, oldV)
    },
    onTranslateChange(newV, oldV) {
      emit('translate-change', newV, oldV)
    },
    onScaleChange(newV, oldV) {
      emit('scale-change', newV, oldV)
    },
    onModeChange(newV, oldV) {
      emit('mode-change', newV, oldV)
    },
    onMarkHover(shape: any) {
      emit('mark-hover', shape)
    },
    onMarkLeave(shape: any) {
      emit('mark-leave', shape)
    },
    onMarkNoHover(e) {},
    onMarkClick(shape: any, e: Event) {
      emit('mark-click', shape)
    },
    onMarkRightClick(shape: any, e) {
      emit('mark-right-click', shape, e)
    },
    onDrawChange(shape: any) {
      emit('mark-change', shape)
    },
    onDrawComplete(shape: any) {
      emit('mark-complete', shape)
    },
    onImageLoading(page: number) {
      loading.value = true
      emit('image-loading', page)
    },
    onImageLoaded(page: number) {
      loading.value = false
      emit('image-loaded', page)
    }
  })
  if (!instance.value) return

  const { init, rerender } = instance.value

  containerResizeDestroy = useResizeListener(
    vm.$el,
    () => {
      if (!initialized) {
        init()
        emit('init', instance.value)
        initialized = true
      } else {
        emit('resize')
        rerender()
        // instance.value?.setMode(modeState.value)
        instance.value?.changePage(pageIndex.value)
      }
    },
    { enableFrame: true }
  )
}

onMounted(() => {
  initMark()

  // 监听设备像素比变化（在切换投屏设备的场景下发生）
  removeListener = onDevicePixelRatioChange(newPixelRatio => {
    instance.value?.rerender()
    instance.value?.setMode(modeState.value)
    instance.value?.changePage(pageIndex.value)
  })
})

defineExpose({
  loading,
  markInstance: instance
})

onBeforeUnmount(() => {
  instance.value?.destroy()
  containerResizeDestroy?.()
  removeListener?.()
})
</script>
<style lang="less" module>
/* chrome start */
.mark-scroll-bar {
  scrollbar-width: auto;
  scrollbar-color: rgb(125, 125, 125) transparent;
}

.mark-scroll-bar-vertical {
  width: 14px !important;
}

.mark-scroll-bar-horizontal {
  height: 14px !important;
}
/* chrome end */

/* safari start */
.mark-scroll-bar::-webkit-scrollbar {
  width: 8px;
  background-color: transparent;
}

.mark-scroll-bar::-webkit-scrollbar-thumb {
  border-radius: 8px;
  background: rgb(125, 125, 125) !important;
}
/* safari end */
</style>
<style lang="less">
.mark-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #fff;

  .mark-scroll-horizontal-wrapper,
  .mark-scroll-vertical-wrapper {
    visibility: hidden;
  }

  &:hover {
    .mark-scroll-horizontal-wrapper,
    .mark-scroll-vertical-wrapper {
      visibility: visible;
    }
  }
}
</style>
