<template>
  <div class="doc-page-container">
    <a-spin :spinning="_loading" tip="加载中..."></a-spin>
    <transition name="mark-fade">
      <Mark
        v-if="pageList.length"
        ref="MarkRef"
        :pages="pageList"
        :page-index="pageIndex"
        :options="markOptions"
        @update:page-index="v => $emit('update:page-index', v)"
        @init="ins => $emit('init', ins)"
        @resize="$emit('resize')"
        @drag="onDrag"
        @scroll="onScroll"
        @translate-change="onTranslateChange"
        @scale-change="onScaleChange"
        @mode-change="onModeChange"
        @mark-click="data => $emit('mark-click', data)"
        @mark-right-click="onMarkRightClick"
        @mark-hover="data => $emit('mark-hover', data)"
        @mark-leave="data => $emit('mark-leave', data)"
        @change-page="i => $emit('change-page', i)"
        @mark-change="data => $emit('mark-change', data)"
        @mark-complete="data => $emit('mark-complete', data)"
        @image-loading="onImageLoading"
        @image-loaded="onImageLoaded"
      />
    </transition>
    <PageMarkToolbarSearchbar v-if="markSearchResults?.length" />
  </div>
</template>
<script lang="ts" setup>
import { type PropType, ref, provide, toRefs, computed, type Ref, watch, watchEffect } from 'vue'
import Mark from './Mark.vue'
import PageMarkToolbarSearchbar from './PageMarkToolbarSearchbar.vue'
import type { MarkBox, OperationProps, PageItem, RemoveMarkOption } from './types'
import type { Func, MarkInstance, MarkOptions, MarkScrollIntoViewOptions, ShapeInstance } from '@intsig/canvas-mark'
import { getTallestMark } from './helper'
import { useInject } from '@/hooks/useInject'
import { debounce } from 'lodash-es'

type MarkDrawShapeParams = {
  visible?: boolean | undefined
  active?: boolean | undefined
}

const { markSearchResults } = useInject(['markSearchResults'])

const props = defineProps({
  documentLoading: {
    type: Boolean,
    default: true
  },
  markOptions: {
    type: Object as PropType<Partial<MarkOptions>>,
    default: () => ({})
  },
  pageIndex: {
    type: Number,
    default: 0
  },
  pageList: {
    type: Array as PropType<PageItem[]>,
    default: () => []
  },
  operationProps: {
    type: Object as PropType<OperationProps>,
    default: () => ({})
  }
})
const emit = defineEmits([
  'update:page-index',
  'update:text-visible',
  'translate-change',
  'scale-change',
  'init',
  'mark-click',
  'mark-right-click',
  'mark-hover',
  'mark-leave',
  'mark-complete',
  'mark-change',
  'change-page',
  'scroll',
  'resize',
  'mode-change',
  'drag',
  'image-loading',
  'image-loaded',
  'rerender',
  'update'
])

const { pageIndex, pageList } = toRefs(props)
const MarkRef = ref<{ markInstance: Ref<MarkInstance> }>()
const getMarkInstance = () => MarkRef.value?.markInstance.value
provide('getMarkInstance', getMarkInstance)

const createMark = (markOptions: MarkBox, options: MarkDrawShapeParams) => {
  const markInstance = getMarkInstance()
  if (!markInstance) return
  const { drawRect, drawPolygon } = markInstance
  const position = markOptions.position
  const selector: string[] = (markOptions.classNames || []).map(o => `.${o}`)
  if (markOptions.attrs) {
    for (const key in markOptions.attrs) {
      selector.push(`[${key}="${markOptions.attrs[key]}"]`)
    }
  }

  const drawGraph = position.length === 4 ? drawRect : drawPolygon
  const shape = drawGraph(
    {
      position: position,
      data: markOptions,
      index: markOptions.page,
      options: {
        selector,
        ...markOptions.canvasStyleOptions
      }
    },
    options
  )

  if (options?.active) {
    shape?.activated(true, { block: 'center' })
  }

  return shape
}

function onScroll(...args) {
  emit('scroll', ...args)
}
function onDrag(...args) {
  emit('drag', ...args)
}
function onTranslateChange(...args) {
  emit('translate-change', ...args)
}
function onScaleChange(...args) {
  emit('scale-change', ...args)
}
function onModeChange(...args) {
  emit('mode-change', ...args)
}

function onMarkRightClick(shape, event) {
  emit('mark-right-click', shape, event)
}

function changePage(page) {
  getMarkInstance()?.changePage(page)
}

const onChangePageFromText = (page: number) => {
  emit('update:page-index', page)
  changePage(page)
}

const _loading = ref(false)
const setLoading = debounce(
  (v: boolean) => {
    _loading.value = v
  },
  100,
  { trailing: true, leading: true }
)
watchEffect(() => setLoading(props.documentLoading))
const onImageLoading = data => {
  setLoading(true)
  emit('image-loading', data)
}
const onImageLoaded = data => {
  _loading.value = false
  setLoading(false)
  emit('image-loaded', data)
}

let activeShapes: ShapeInstance[] = []

defineExpose({
  getMarkInstance,
  createMark,
  changePage,
  update(pages?) {
    const markInstance = getMarkInstance()
    markInstance?.updatePages(pages ?? props.pageList)
    emit('update', markInstance)
  },
  onChangePageFromText,
  onDrag,
  onScroll,
  onTranslateChange,
  onScaleChange,
  onModeChange,
  removeMarkByPage(options: RemoveMarkOption = {}) {
    const { attr, selector, page } = options
    const shapes = getMarkInstance()?.queryAllState(attr || selector, page)
    shapes?.forEach(shape => shape.destroy())
  },
  commonActive(shapes, activeOptions?: MarkScrollIntoViewOptions & { unit?: number; shapeOptions?: any }) {
    const { shapeOptions } = activeOptions || {}

    activeShapes = shapes || []

    shapes.forEach((s, i) => {
      // s.setState({ visible: true })
      if (shapeOptions) {
        s.updateOptions(shapeOptions)
      }
    })

    const tallestShape = getTallestMark(shapes)

    // 仅设置一个为激活状态
    tallestShape?.setState({ active: true })
    // 聚焦最上面的框
    tallestShape?.scrollIntoView(activeOptions)
    // 给多个框添加动画效果
    getMarkInstance()?.animate({ shapes }, { unit: activeOptions?.unit }).run()
  },
  setActive(
    page: number,
    selector: string,
    activeOptions?: MarkScrollIntoViewOptions & { unit?: number; shapeOptions?: any }
  ) {
    const shapes = getMarkInstance()?.queryAllState(selector, page)
    if (!shapes?.length) return
    this.commonActive(shapes, activeOptions)
  },
  batchSetActive(
    options: { page: number; selector: string }[],
    activeOptions?: MarkScrollIntoViewOptions & { unit?: number; shapeOptions?: any }
  ) {
    const allShapes: any[] = []
    for (const item of options) {
      const shapes = getMarkInstance()?.queryAllState(item.selector, item.page)
      if (!shapes?.length) continue
      allShapes.push(...shapes)
    }

    this.commonActive(allShapes, activeOptions)
  },
  removeActive({ shapeOptions }: any = {}) {
    activeShapes?.forEach(s => {
      if (shapeOptions) {
        s.updateOptions(shapeOptions)
      }
      // s?.setState({ visible: false })
      s?.deactivated()
    })
    activeShapes && getMarkInstance()?.render()
  }
})
</script>
<style lang="less" scoped>
.doc-page-container {
  position: relative;
  min-width: 300px;
  flex: 1;
  height: 100%;
  overflow: hidden;
  // background: #e1e4eb;

  display: flex;
  align-items: stretch;

  :deep(.ant-spin) {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: -1;
    pointer-events: none;
  }
  :deep(.ant-spin-spinning) {
    z-index: 1;
  }

  :deep(.ant-skeleton) {
    width: 100%;
    height: 100%;

    .ant-skeleton-content {
      width: 100%;
      height: 100%;

      .ant-skeleton-paragraph {
        padding: 20px;
        width: 100%;
        height: 100%;
        text-align: center;

        li {
          width: 100% !important;
          height: calc(100% - 10% - 8px) !important;
          border-radius: 0;
          display: inline-block;
        }
      }
    }
  }
}
</style>
<style>
.mark-fade-enter-active,
.mark-fade-leave-active {
  transition: opacity 0.5s ease;
}

.mark-fade-enter-from,
.mark-fade-leave-to {
  opacity: 0;
}
</style>
