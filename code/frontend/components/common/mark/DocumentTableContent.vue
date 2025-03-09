<template>
  <div class="doc-table-content scroll-bar">
    <a-skeleton :title="false" :paragraph="{ rows: 10 }" active :loading="catalogLoading">
      <a-tree
        v-model:selectedKeys="selectedKeys"
        :showIcon="false"
        :tree-data="tableContent"
        defaultExpandAll
        @select="onSelect"
      >
        <!-- show-line -->
        <template v-slot:switcherIcon="{ switcherCls, expanded }">
          <caret-up-outlined v-if="expanded" :class="switcherCls" />
          <caret-down-outlined v-else :class="switcherCls" />
        </template>
        <template v-slot:title="{ content }">
          <span :title="content">
            {{ content }}
          </span>
        </template>
      </a-tree>
    </a-skeleton>
  </div>
</template>
<script lang="ts" setup>
import { useInject } from '@/hooks/useInject'
import { CaretUpOutlined, CaretDownOutlined } from '@ant-design/icons-vue'
import { ref, type PropType } from 'vue'

defineProps({
  tableContent: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  catalogLoading: {
    type: Boolean,
    default: true
  }
})
const { PageMarkRef, pageIndex } = useInject(['PageMarkRef', 'pageIndex'])
const selectedKeys = ref<string[]>([])

const clearTOCMark = () => {
  const shapes = PageMarkRef.value?.getMarkInstance()?.queryAllState('.toc-item')
  shapes?.forEach(shape => {
    shape.destroy()
  })
}

const onSelect = (i, e) => {
  const item = e.node.dataRef
  const newPageIndex = item.pageNum
  if (pageIndex.value !== newPageIndex) {
    PageMarkRef.value?.changePage(newPageIndex)
  }

  clearTOCMark()

  PageMarkRef.value.createMark(
    {
      page: newPageIndex,
      position: item.pos,
      classNames: ['toc-item'],
      canvasStyleOptions: {
        strokeStyle: '#1A66FF'
      }
    },
    {
      active: true
    }
  )
  track({ name: `目录查看`, keyword: item.content, page: '问答页' })
}
</script>
<style lang="less" scoped>
.doc-table-content {
  height: 100%;
  padding: 0;
  background: #ccd0d9;

  :deep(.ant-tree) {
    background: #ccd0d9;

    .ant-tree-list {
      width: 100%;
    }

    .ant-tree-indent {
      // display: none;
      .ant-tree-indent-unit {
        width: 0px;

        &:nth-of-type(0),
        &:nth-of-type(1) {
          width: 6px;
        }
      }
    }

    .ant-tree-treenode {
      width: 180px;
      width: 100%;
      padding: 0 0 0 7px;
      height: 36px;

      font-size: 14px;
      font-weight: 400;
      color: #000000;
      line-height: 20px;

      &.ant-tree-treenode-selected {
        // background: #e0ebff;
        color: var(--primary-color);
      }
    }

    .ant-tree-node-content-wrapper {
      line-height: 36px;
      height: 36px;
      flex: 1;
      user-select: auto;

      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      .ant-tree-title {
        div {
          display: inline;
        }
      }
    }
    .ant-tree-node-content-wrapper:hover {
      background-color: transparent;
    }

    .ant-tree-node-selected {
      background-color: transparent;
    }

    .ant-tree-switcher {
      display: flex;
      align-items: center;
      justify-content: center;
      // background: #ccd0d9;

      svg {
        fill: #959ba6;
      }
    }
    .ant-tree-switcher-icon {
      font-size: 14px;
      display: flex;
      align-items: center;
    }
  }

  :deep(.ant-skeleton-content) {
    padding: 12px;

    li {
      height: 18px;
    }
  }
}
</style>
