<template>
  <div class="document-preview" :class="[menuVisible ? 'document-menu-visible' : 'document-menu-hidden']">
    <PageMarkToolbar
      :max="pageList.length"
      :page-index="pageIndex"
      @update:page-index="onChangePageFromToolbar"
      :operationProps="operationProps"
      @next="nextPage"
      @prev="prevPage"
      @download="emit('download')"
    >
      <template v-slot:extension>
        <slot name="toolbar-extension" />
      </template>
      <template v-slot:left>
        <DocumentMenu v-model:menu-state="menuState" v-model:menu-visible="menuVisible" />
      </template>
    </PageMarkToolbar>
    <div class="document-container">
      <div class="page-mark-menu-content">
        <DocumentThumbnails
          v-if="menuState === MenuState.IMAGE"
          :thumbnailLoading="thumbnailLoading"
          :imageList="imageList"
          :highlightThumbnailPages="highlightThumbnailPages"
        />
        <DocumentTableContent
          v-if="menuState === MenuState.TABLE"
          :catalogLoading="catalogLoading"
          :tableContent="tableContent"
        />
        <ResizeChunk v-show="menuVisible" class="!right-[-10px]" placement="right" modifiers=".parent" />
      </div>
      <PageMark
        ref="PageMarkRef"
        :documentLoading="documentLoading"
        :page-list="pageList"
        v-model:page-index="pageIndex"
        :mark-options="markOptionsData"
        @mark-right-click="onMarkRightClick"
        @mark-hover="onMarkHover"
        @mark-leave="onMarkLeave"
        @init="onInit"
        @update="onUpdatePages"
        @scroll="onMarkScroll"
      >
      </PageMark>
    </div>
    <PageContextmenu
      v-model:visible="pageContextMenuVisible"
      :position="pageContextMenuPos"
      :page="pageContextMenuPageIndex"
    />
    <div id="TourStep3"></div>
    <div id="TourStep4"></div>
    <div id="CopyMarkText" class="fixed hidden z-[1000] w-[80px] h-16 cursor-pointer">
      <div class="toolbar-wrapper p-1 bg-white rounded-lg flex items-center float-left">
        <div
          class="w-9 h-9 flex items-center justify-center transition-all rounded-md cursor-pointer hover:bg-gray-100 hover:text-secondary-color"
          title="复制"
          @click.stop="onCopy"
        >
          <Copy class="w-6 h-6 justify-center" />
        </div>
        <!-- <div
          class="w-9 h-9 flex items-center justify-center transition-all rounded-md cursor-pointer hover:bg-gray-100 hover:text-secondary-color"
          title="编辑"
          @click.stop="onEdit"
        >
          <Edit class="w-6 h-6 justify-center" />
        </div> -->
        <!-- <div
          class="w-9 h-9 flex items-center justify-center transition-all rounded-md cursor-pointer hover:bg-gray-100 hover:text-secondary-color"
          title="收藏"
          @click.stop="onCollect"
        >
          <Bookmark class="w-6 h-6 justify-center" />
        </div> -->
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, provide, toRefs, computed, watch, watchEffect } from 'vue'
import type { PropType } from 'vue'
import PageMark from './PageMark.vue'
import DocumentMenu from './DocumentMenu.vue'
import DocumentThumbnails from './DocumentThumbnails.vue'
import DocumentTableContent from './DocumentTableContent.vue'
import { MenuState } from './helper'
import type { OperationProps } from './types'
import PageMarkToolbar from './PageMarkToolbar.vue'
import PageContextmenu from './PageContextmenu.vue'
import type { Func, MarkOptions, RenderMode } from '@intsig/canvas-mark'
import { useDocumentStructured } from './useDocumentStructured'
import CopyOutlined from './images/CopyOutlined.vue'
import ResizeChunk from '@/components/ResizeChunk/index.vue'
import { useCustomCopyPlugin } from './useCustomCopyPlugin'
import { Copy, Edit } from '@icon-park/vue-next'
import { Bookmark } from 'lucide-vue-next'

const props = defineProps({
  fileId: {
    type: [String, Number]
  },
  pageList: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  tableContent: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  imageList: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  documentLoading: {
    type: Boolean,
    default: false
  },
  catalogLoading: {
    type: Boolean,
    default: false
  },
  thumbnailLoading: {
    type: Boolean,
    default: false
  },
  operationProps: {
    type: Object as PropType<OperationProps>,
    default: () => ({})
  },
  markOptions: {
    type: Object as PropType<Partial<MarkOptions>>,
    default: () => ({})
  },
  highlightThumbnailPages: {
    type: Array as PropType<number[]>,
    default: () => []
  }
})

const { pageList, fileId, tableContent, catalogLoading, thumbnailLoading } = toRefs(props)
const PageMarkRef = ref()
const pageIndex = ref(1)
const getMarkInstance = () => PageMarkRef.value.getMarkInstance()
const modeState = ref<RenderMode>('default')

provide('PageMarkRef', PageMarkRef)
provide('pageIndex', pageIndex)
provide('pageList', pageList)
provide('getMarkInstance', getMarkInstance)
provide('markSearchResults', ref())
provide('modeState', modeState)

const markOptionsData = computed<Partial<MarkOptions>>(
  () =>
    ({
      enableCopyText: false,
      mode: modeState,
      onCopySelected: onCopySelected,
      plugins: [useCustomCopyPlugin, useDocumentStructured],
      ...props.markOptions
    } as any)
)

watch(
  [fileId],
  () => {
    if (!fileId?.value) return
    pageIndex.value = 1
  },
  { immediate: true }
)
const emit = defineEmits(['init', 'download', 'init-full', 'selection'])
const menuState = ref(MenuState.TABLE)
const menuVisible = ref(true)

// 没有目录就默认展示缩略图
watchEffect(() => {
  if (thumbnailLoading.value || catalogLoading.value) return
  menuState.value = tableContent.value?.length ? MenuState.TABLE : MenuState.IMAGE
})

const onChangePageFromToolbar = (page: number) => {
  PageMarkRef.value.changePage(page)
}

const pageSum = computed(() => pageList.value.length)
function nextPage() {
  if (pageIndex.value >= 1 && pageIndex.value < pageSum.value) {
    const newPageIndex = pageIndex.value + 1 <= pageSum.value ? pageIndex.value + 1 : pageSum.value
    PageMarkRef.value.changePage(newPageIndex)
  }
}
function prevPage() {
  if (pageIndex.value >= 1 && pageIndex.value <= pageSum.value) {
    const newPageIndex = pageIndex.value - 1 > 0 ? pageIndex.value - 1 : 1
    PageMarkRef.value.changePage(newPageIndex)
  }
}

const pageContextMenuVisible = ref(false)
const pageContextMenuPos = ref<number[]>([])
const pageContextMenuPageIndex = ref(0)
const onMarkRightClick = async (shape, event) => {
  event.preventDefault()
  event.stopPropagation()
  if (shape.options.type === 'image') {
    pageContextMenuVisible.value = true
    pageContextMenuPageIndex.value = shape.state.index
    pageContextMenuPos.value = [event.clientX, event.clientY]
  }
}

const onInit = ins => {
  emit('init', ins)
}

const onUpdatePages = ins => {
  emit('init-full')
}

const onMarkHover = e => {}
const onMarkLeave = e => {}
const onMarkScroll = () => {}

const onCopy = e => {
  getMarkInstance()?.plugins?.[useDocumentStructured.name]?.onCopy?.(e)
}

const onEdit = async e => {
  const data = await getMarkInstance()?.plugins?.[useDocumentStructured.name]?.getText?.(e)
  data && emit('selection', data)
}

const onCollect = e => {
  getMarkInstance()?.plugins?.[useDocumentStructured.name]?.onCollect?.(e)
}

const onCopySelected = (...args) => {
  getMarkInstance()?.plugins?.[useDocumentStructured.name]?.onCopySelected?.(...args)
}

onBeforeUnmount(() => {})

defineExpose({
  PageMarkRef,
  getMarkInstance
})
</script>
<style lang="less" scoped>
.document-preview {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;

  .document-container {
    position: absolute;
    left: 0;
    top: 40px;
    width: 100%;
    height: calc(100% - 40px);
    display: flex;
    align-items: stretch;
  }

  .page-mark-menu-content {
    position: relative;
    // flex-shrink: 0;
    // flex-grow: 0;
    width: 180px;
    min-width: 180px;
    border-right: 1px solid rgba(0, 0, 0, 0.1);

    // transition: width 0.3s;
    max-width: 400px;
  }

  &.document-menu-visible {
    // .page-mark-menu-content {
    //   width: 200px;
    // }
  }

  &.document-menu-hidden {
    .page-mark-menu-content {
      width: 0 !important;
      min-width: 0 !important;
    }
  }
}

#CopyMarkText {
  .toolbar-wrapper {
    box-shadow: 0px 6px 18px 0px rgba(3, 10, 26, 0.12);
  }
}
</style>
<style lang="less">
@import url(./style/index.less);
</style>
