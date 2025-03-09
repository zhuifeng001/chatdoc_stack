<template>
  <div :class="$style['kb-document-list-wrapper']" id="KBDocumentList">
    <KBDocumentListHeader v-if="showHeader" />
    <!-- <VirtualList
      ref="VirtualListRef"
      :class="[$style['kb-document-list'], 'scroll-bar']"
      :list="userFileData"
      :visible-count="15"
      :item-default-height="56"
      item-key="_id"
      :item-component="KBDocumentItem"
      :extra-props="{ treeData: userFileData, onActive: s => emit('active', s) }"
    ></VirtualList> -->
    <KBDocumentListTree />
    <div id="DragHoverLine" class="drag-hover">
      <div class="drag-circle"></div>
      <div class="drag-line"></div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import {
  ref,
  getCurrentInstance,
  type PropType,
  onMounted,
  watch,
  computed,
  reactive,
  provide,
  onBeforeUnmount
} from 'vue'
import VirtualList from '@/components/common/VirtualList/index.vue'
import KBDocumentListHeader from './KBDocumentListHeader.vue'
import KBDocumentItem from './KBDocumentItem.vue'
import KBDocumentListTree from './KBDocumentListTree.vue'
import { useKBStore } from '../../store'
import { storeToRefs } from 'pinia'
import { useDrag } from '../../hooks/useDrag'

const vm = getCurrentInstance()?.proxy as any

defineProps({
  showHeader: {
    type: Boolean,
    default: false
  },
  list: {
    type: Array as PropType<any[]>,
    default: () => []
  }
})
const emit = defineEmits(['select', 'active'])
const store = useKBStore()
const { userFileData } = storeToRefs(store)

const dragObject = useDrag()
provide('dragObject', dragObject)
const VirtualListRef = ref()

watch(
  () => userFileData.value.find(o => o._autoActive),
  async autoActiveItem => {
    if (!autoActiveItem?._autoActive) return
    const index = userFileData.value.findIndex(o => o === autoActiveItem)
    if (!vm?.$el.querySelector(`[data-index="${index}"]`)) {
      await VirtualListRef.value?.scrollToIndex?.(index)
    }
    autoActiveItem._autoActive = false
  }
)

const onClose = () => {
  // 初始化编辑状态
  userFileData.value?.forEach(f1 => {
    if (f1._edit) {
      store.closeEditTitle(f1)
    }
    f1.children?.forEach(f2 => {
      if (f2._edit) {
        store.closeEditTitle(f2)
      }
    })
  })
}

onMounted(() => {
  document.getElementById('__nuxt')?.addEventListener('click', onClose)
  document.getElementById('__nuxt')?.addEventListener('mousedown', onClose)
})

onBeforeUnmount(() => {
  document.getElementById('__nuxt')?.removeEventListener('click', onClose)
  document.getElementById('__nuxt')?.removeEventListener('mousedown', onClose)
})
</script>
<style lang="less" module>
.kb-document-list-wrapper {
  position: relative;

  display: flex;
  flex-direction: column;
  width: 259px;
}

.kb-document-list {
  position: relative !important;
  padding: 0 0 0 0;
  height: calc(100% - 33px) !important;
  flex-grow: 0;
  // overflow-y: scroll !important;

  &.multiple-selection {
    :global {
      .ant-tree-checkbox {
        display: inline-block;
      }

      .ant-tree-node-content-wrapper {
        width: 195px;
        flex-basis: 195px;
      }
    }
  }
}
</style>
<style lang="less">
.drag-hover {
  position: fixed;
  // top: -4px;
  // left: 12px;
  // width: calc(100% - 12px);
  align-items: center;
  display: flex;
  display: none;
  z-index: 100;

  .drag-circle {
    width: 8px;
    height: 8px;
    background: #ffffff;
    border: 2px solid var(--primary-color);
    border-radius: 50%;
  }

  .drag-line {
    width: 100%;
    height: 2px;
    background: var(--primary-color);
  }
}
.drag-target-hover {
  .drag-hover {
    display: flex;
  }
}
.drag-target-folder-hover {
  background: #e0ebff;
}
</style>
