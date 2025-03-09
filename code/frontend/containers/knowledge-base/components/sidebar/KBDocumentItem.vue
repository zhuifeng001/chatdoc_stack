<template>
  <div
    :class="[
      'kb-doc-item',
      $style['tree-item'],
      source._active || isActiveChild ? $style['active'] : '',
      source._checked || checkedChildNum ? $style['checked'] : ''
    ]"
    :data-group="source.type"
    :data-index="index"
    :draggable="judgeChildEdit()"
    :data-id="source._id"
    @dragstart="dragObject.onDragStart"
    @dragover="dragObject.onDragOver"
    @dragenter="dragObject.onDragEnter"
    @dragleave="dragObject.onDragLeave"
    @dragend="dragObject.onDragEnd"
    @drop="dragObject.onDrop"
  >
    <div :class="$style['item-checkbox-wrapper']">
      <a-checkbox
        v-show="source._selection"
        :class="$style['item-checkbox']"
        :indeterminate="indeterminate"
        :checked="source._checked"
        @change="onCheckedChange"
      ></a-checkbox>
      <div :class="[$style['item-main'], source._selection ? $style['item-main-selection'] : '']">
        <img :src="getFileIcon(source.type, source.title)" alt="" />
        <div :class="$style['item-wrapper']" @click="onActiveItem">
          <div :class="$style['item-title-wrapper']">
            <div :class="$style['item-title-editor']">
              <acg-tooltip v-if="!source._edit" overlayClassName="acg-tooltip" :title="source.title">
                <span :class="$style['item-title']">{{ source.title }}</span>
              </acg-tooltip>
              <a-input
                v-else
                :id="`${source.type}${source.id}`"
                v-model:value="source.title"
                @pressEnter="store.closeEditTitle(source)"
                @click.stop
                @mousedown.stop
              />
            </div>
            <a-tooltip overlayClassName="acg-tooltip" :title="source.type === 'file' ? '刪除文档' : '删除文件夹'">
              <span v-if="!selectedMultiple && source.type !== 'kb'" :class="$style['delete-icon']">
                <DeleteOutlined @click.stop="onDeleteFolderOrFile(source)" />
              </span>
            </a-tooltip>
            <span v-if="selectedMultiple && source.children?.length && checkedChildNum" :class="$style['selected-num']">
              {{ checkedChildNum }}
            </span>
            <span
              v-if="source.children?.length"
              :class="[$style['expand-symbol'], source._expand ? $style['rotate'] : '']"
            >
              <Up size="16" />
              <!-- <Down v-show="!source._expand" size="16" /> -->
            </span>
          </div>
          <div :class="$style['item-desc']">
            <span v-if="source.type === 'kb' || source.type === 'folder'"> {{ source.children?.length }} 个文件 </span>
            <span v-else> {{ formatDate(source.updateTime) }} </span>
            <FileStatus :source="source" />
          </div>
        </div>
      </div>
    </div>
    <div v-if="source._expand && source.children?.length" :class="$style['item-children']">
      <KBDocumentWrapper
        :treeData="treeData"
        :children="source.children"
        @checked-change="onChildCheckedChange"
        @select="onActiveChild"
        @active="s => props.onActive?.(s)"
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { toRefs, type PropType, computed, getCurrentInstance, onMounted, nextTick } from 'vue'
import KBDocumentWrapper from './KBDocumentWrapper.vue'
import FileStatus from '../suite/FileStatus.vue'
import { getFileIcon } from '../../helper'
import { useInject } from '@/hooks/useInject'
import type { DragObject } from '../../hooks/useDrag'
import { storeToRefs } from 'pinia'
import { useKBStore } from '../../store'
import { formatDate } from '../../utils/date'
import DeleteOutlined from '../../images/DeleteOutlined.vue'
import { useDeleteFile } from '../../hooks/useDeleteFile'
import { Up, Down } from '@icon-park/vue-next'

const { dragObject }: { dragObject: DragObject } = useInject(['dragObject'])

const props = defineProps({
  index: {
    type: Number,
    required: true
  },
  source: {
    type: Object as PropType<any>,
    required: true
  },
  treeData: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  onActive: {
    type: Function
  }
})

const { source } = toRefs(props)

const store = useKBStore()
const { selectedMultiple } = storeToRefs(store)

const onCheckedChange = e => {
  const v = e.target.checked
  source.value._checked = v
  source.value.children?.forEach(o => (o._checked = v))
}
const onChildCheckedChange = () => {
  source.value._checked = source.value.children.every(o => o._checked)
}
const indeterminate = computed(() => {
  return (
    !!source.value.children?.length &&
    !source.value.children.every(o => o._checked) &&
    source.value.children.some(o => o._checked)
  )
})
const onActiveChild = child => {
  props.onActive?.(child)
}
const onActiveItem = () => {
  source.value._expand = !source.value._expand
  props.onActive?.(source.value)
}
const isActiveChild = computed(() => source.value?.children?.some(o => o._active))
const checkedChildNum = computed(() => source.value.children?.filter(o => o._checked).length)

const { onDeleteFolderOrFile } = useDeleteFile()

const judgeChildEdit = () => {
  if (!['file', 'folder'].includes(source.value.type)) return false
  if (source.value._edit) return false

  if (!source.value?.children?.length) return true
  const child = source.value.children.find(child => child._edit)
  if (child) return false
  return true
}
</script>

<style lang="less" module>
.tree-item {
  margin-bottom: 5px;
  position: relative;
  padding: 10px 0 10px;
  // border-radius: 4px;
  transition: background 300ms;
  cursor: pointer;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 10px;
    width: calc(100% - 20px);
    height: 1px;
    background: #e1e4eb;
  }

  &.checked {
    // background: #f2f4f7;
  }

  &:hover,
  &.active {
    // background: #e0ebff;
    // background: linear-gradient(90deg, rgba(26, 102, 255, 0.1) 0%, rgba(26, 102, 255, 0.02) 100%);

    .selected-num {
      background: var(--primary-color) !important;
      color: #fff;
    }

    .item-title-wrapper {
      .item-title {
        color: var(--primary-color);
      }
    }
  }
}

.item-checkbox-wrapper {
  display: flex;
  padding: 0 20px 0;

  .item-checkbox {
    position: relative;
    top: -1px;
    margin-right: 6px;
  }
}
.item-main {
  width: 100%;
  flex: 1;
  display: flex;
  align-items: flex-start;

  &.item-main-selection {
    width: calc(100% - 24px);

    .item-title-editor {
      width: 100%;
    }
  }

  &:hover {
    .delete-icon {
      opacity: 1;
      visibility: visible;
    }
  }

  img {
    margin-right: 4px;
    width: 20px;
    height: 20px;
  }
}

.item-wrapper {
  width: calc(100% - 24px);
}

.item-title-wrapper {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .item-title {
    display: block;
    width: 100%;
    font-size: 14px;
    font-weight: 500;
    color: #000000;
    line-height: 20px;

    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .selected-num {
    padding: 4px;
    min-width: 16px;
    height: 16px;
    background: #e1e4eb;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .expand-symbol {
    display: flex;
    color: #959ba6;
    transition: transform 0.3s;

    &.rotate {
      transform: rotateX(180deg);
    }
  }
}

.delete-icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
  color: #959ba6;

  &:hover {
    color: var(--primary-color);
  }
}

.item-title-editor {
  width: calc(100% - 20px);
  :global {
    .ant-input {
      border: 0;
      padding: 0 4px;
      box-shadow: none;
    }
  }
}
.item-desc {
  font-size: 12px;
  font-weight: 400;
  color: #000000;
  line-height: 16px;
  display: flex;
  justify-content: space-between;
}

.item-children {
  position: relative;
  margin-top: 8px;
  max-height: 200px;
  // background: #f2f4f7;
  // border-radius: 4px;

  :global {
    .virtual-item:last-child .kb-doc-children-item {
      border-color: transparent;
    }
  }
}
</style>
