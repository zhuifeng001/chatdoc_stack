<template>
  <!-- multiple -->
  <div :class="$style['tree-box-wrapper']">
    <div :class="$style['tree-box-body']">
      <a-directory-tree
        ref="DocumentTreeRef"
        v-model:expandedKeys="expandedKeys"
        v-model:selectedKeys="selectedKeys"
        v-model:checkedKeys="checkedKeys"
        :tree-data="fileTreeData"
        :fieldNames="{ title: 'name', key: '_id', children: 'children' }"
        @select="onSelect"
        @check="onCheck"
        @expand="onExpand"
        :checkable="selectedMultiple"
      >
        <!-- :height="treeHeight" -->
        <!-- 增加高度属性，开启虚拟滚动 -->
        <template v-slot:icon="{ data: source }">
          <img
            v-if="source.type === 'folder'"
            :class="$style['node-icon']"
            :src="getFileIcon(source.type, source.title)"
            alt=""
          />
        </template>
        <template #title="{ data: source, expanded }">
          <div :class="$style['item-wrapper']" @click="store.onActive(source, true)" :data-item-id="source._id">
            <div :class="$style['item-title-wrapper']">
              <acg-tooltip v-if="!source._edit" overlayClassName="acg-tooltip" :title="source.title" placement="bottom">
                <span :class="$style['item-title']">{{ source.title }}</span>
              </acg-tooltip>
              <!-- <a-tooltip overlayClassName="acg-tooltip" :title="source.type === 'file' ? '刪除文档' : '删除文件夹'">
                <span v-if="!selectedMultiple" :class="$style['delete-icon']">
                  <DeleteOutlined @click.stop="onDeleteFolderOrFile(source)" />
                </span>
              </a-tooltip> -->
              <span
                v-if="selectedMultiple && source.children?.length && checkedChildNum"
                :class="$style['selected-num']"
              >
                {{ checkedChildNum }}
              </span>
              <span v-if="source.children?.length" :class="[$style['expand-symbol'], expanded ? $style['rotate'] : '']">
                <Up size="16" />
                <!-- <Down v-show="!source._expand" size="16" /> -->
              </span>
            </div>
            <div :class="$style['item-desc']">
              <span v-if="source.type === 'kb' || source.type === 'folder'">
                {{ source.children?.length }} 个文件
              </span>
              <span v-else> {{ formatDate(source.updateTime) }} </span>
              <FileStatus :source="source" />
            </div>
          </div>
        </template>
      </a-directory-tree>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useKBStore } from '../../store'
import { getFileIcon } from '../../helper'
import { useDeleteFile } from '../../hooks/useDeleteFile'
import FileStatus from '../suite/FileStatus.vue'
import DeleteOutlined from '../../images/DeleteOutlined.vue'
import { Up, Down } from '@icon-park/vue-next'

const expandedKeys = ref<string[]>([])
const selectedKeys = ref<string[]>([])

const store = useKBStore()
const { checkedKeys, selectedMultiple, selectedAll, fileTreeData, selectedFile, previewFile } = storeToRefs(store)
const DocumentTreeRef = ref()
const { onDeleteFolderOrFile } = useDeleteFile()
const checkedChildNum = 0

watch(fileTreeData, () => {
  expandedKeys.value.push(...fileTreeData.value.map(item => item._id))
  updateTreeHeight()
})

// 反向联动
watch(previewFile, val => {
  setTimeout(() => {
    const paths = val?._paths.slice() || []
    const newKey = paths.slice(0, 1) || []
    if (newKey.join(',') !== selectedKeys.value.join(',')) {
      selectedKeys.value = newKey
      // expandedKeys.value = paths
    }
  })
})

const onExpand = value => {
  // console.log('onExpand args :>> ', expandedKeys.value)
}
const onSelect = value => {
  // console.log('onSelect args :>> ', selectedKeys.value)
}
const onCheck: any = (value = []) => {
  store.updateCheckedDocuments(value)
}

watch(selectedAll, () => {
  if (selectedAll.value) {
    checkedKeys.value = store.updateCheckedDocuments(true)
  } else {
    checkedKeys.value = store.updateCheckedDocuments(false)
  }
})
const treeHeight = ref(0)
const vm = getCurrentInstance()?.proxy as any
const updateTreeHeight = () => {
  nextTick(() => {
    treeHeight.value = document.body.clientHeight - 175
  })
}
</script>
<style lang="less" module>
@import '~/assets/styles/custom.less';

.tree-box-wrapper {
  height: calc(100% - 34px);
  width: 100%;

  .tree-box-body {
    height: 100%;
    width: 100%;
    overflow-x: hidden;

    :global {
      .ant-tree.ant-tree-directory {
        width: 100%;
        height: 100%;
        padding: 0;

        .ant-tree-list {
          height: 100%;
          .scroll-bar();
        }

        .ant-tree-treenode {
          padding: 0;
          overflow: hidden;
        }
        .ant-tree-switcher {
          display: none;
        }

        .ant-tree-checkbox {
          margin: 0 0 0 16px;
          top: -6px;
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          flex-grow: 0;

          .ant-tree-checkbox-inner {
            width: 100%;
            height: 100%;

            &::after {
              top: 46%;
            }
          }
        }

        .ant-tree-checkbox-checked {
          .ant-tree-checkbox-inner {
            background-color: #ababab;
            border-color: #ababab;
          }
        }

        .ant-tree-checkbox,
        .ant-tree-checkbox-checked {
          &:hover {
            .ant-tree-checkbox-inner {
              border-color: #999;
            }
          }
        }

        .ant-tree-checkbox-checked {
          &:hover::after {
            border-color: #999;
          }
        }

        .ant-tree-node-content-wrapper {
          display: inline-block;
          margin: 0 !important;
          padding: 8px 0 8px 12px !important;
          display: flex;
          align-items: flex-start;
          overflow: hidden;

          > .ant-tree-title {
            flex-grow: 1;
            flex-shrink: 1;
            overflow: hidden;
          }

          .ant-tree-iconEle {
            margin-right: 4px;
            width: 20px;
            height: 20px;
            font-size: 0;
          }
        }

        .ant-tree-treenode:hover::before,
        .ant-tree-treenode::before {
          bottom: 0 !important;
        }
        .ant-tree-treenode-selected:hover::before,
        .ant-tree-treenode-selected::before {
          bottom: 0 !important;
          background: #e0ebff !important;
        }

        .ant-tree-node-content-wrapper.ant-tree-node-selected {
          color: #1a66ff !important;
          background: transparent;
        }
      }
    }
  }
}

.node-icon {
  width: 100%;
  height: 100%;
}
.item-wrapper {
  width: calc(100% - 24px);

  &:hover {
    .delete-icon {
      opacity: 1;
      visibility: visible;
    }
  }
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

.item-desc {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
