<template>
  <div
    :class="[
      'kb-doc-children-item',
      $style['child-item'],
      source.id === selectedFile?.id ? $style['active'] : '',
      source._checked ? $style['checked'] : ''
    ]"
    @click.stop="onActive?.(source)"
    data-group="file"
    :data-index="index"
    :data-id="source._id"
    :draggable="!source._edit"
    @dragstart="dragObject.onDragStart"
    @dragover="dragObject.onDragOver"
    @dragenter="dragObject.onDragEnter"
    @dragleave="dragObject.onDragLeave"
    @dragend="dragObject.onDragEnd"
    @drop="dragObject.onDrop"
  >
    <a-checkbox
      v-show="source._selection"
      :class="$style['child-item-checkbox']"
      :checked="source._checked"
      @change="onCheckedChange"
    ></a-checkbox>
    <div :class="[$style['item-title-wrapper'], source._selection ? $style['item-main-selection'] : '']">
      <div :class="[$style['item-title-editor'], source._parent?.type === 'kb' ? $style['kb-title-editor'] : '']">
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
      <FileStatus
        v-if="!selectedMultiple"
        :class="$style['status-icon']"
        type="small"
        :successVisible="source?._parent ? source._parent.type === 'folder' : true"
        :source="source"
      />
      <a-tooltip overlayClassName="acg-tooltip" title="刪除文档">
        <span v-if="!selectedMultiple && source.type === 'file'" :class="$style['delete-icon']">
          <DeleteOutlined @click.stop="onDeleteFolderOrFile(source)" />
        </span>
      </a-tooltip>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { toRefs, type PropType, onMounted, getCurrentInstance } from 'vue'
import { useInject } from '@/hooks/useInject'
import type { DragObject } from '../../hooks/useDrag'
import { storeToRefs } from 'pinia'
import { useKBStore } from '../../store'
import { useDeleteFile } from '../../hooks/useDeleteFile'
import DeleteOutlined from '../../images/DeleteOutlined.vue'
import FileStatus from '../suite/FileStatus.vue'
import type { UserFile } from '../../types'

const props = defineProps({
  index: {
    type: Number,
    required: true
  },
  source: {
    type: Object as PropType<UserFile>,
    required: true
  },
  onCheckedChange: { type: Function },
  onActive: { type: Function }
})
const { source } = toRefs(props)
const { dragObject }: { dragObject: DragObject } = useInject(['dragObject'])
const { onDeleteFolderOrFile } = useDeleteFile()
const store = useKBStore()
const { selectedMultiple, selectedFile } = storeToRefs(store)
const onCheckedChange = e => {
  source.value._checked = e.target.checked
  props.onCheckedChange?.(source.value)
}
</script>
<style lang="less" module>
.child-item {
  position: relative;
  padding: 0 20px 0 42px;
  height: 32px;
  display: flex;
  align-items: center;
  // border-bottom: 1px solid #e1e4eb;
  transition: all 0.3s;
  color: #000000;

  &.checked {
    background: #f2f4f7;
  }

  &:hover,
  &.active {
    color: var(--primary-color);
    background: #e0ebff;
  }

  &-checkbox {
    margin-right: 6px;
  }

  img {
    flex: 0;
    margin-right: 4px;
    width: 20px;
    height: 20px;
  }

  .item-title-wrapper {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;

    &.item-main-selection {
      width: calc(100% - 24px);

      .item-title-editor {
        &:hover {
          width: 100%;
        }
      }
    }

    .item-title-editor {
      width: calc(100% - 20px);

      &.kb-title-editor {
        width: 100%;
      }

      :global {
        .ant-input {
          border: 0;
          padding: 0 4px;
          box-shadow: none;
        }
      }
    }

    .item-title {
      display: block;
      flex-grow: 1;
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;

      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .delete-icon {
      margin-left: 2px;
      flex-shrink: 0;
      width: 0;
      height: 0;
      display: flex;
      align-items: center;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s;
      color: #959ba6;

      svg {
        width: 100%;
        height: 100%;
      }

      &:hover {
        color: var(--primary-color);
      }
    }

    .status-icon {
      display: flex;
    }

    &:hover {
      .item-title-editor {
        width: calc(100% - 36px);
      }
      .kb-title-editor {
        width: calc(100% - 20px);
      }
      .delete-icon {
        width: 18px;
        height: 18px;
        opacity: 1;
        visibility: visible;
      }
    }
  }
}
</style>
