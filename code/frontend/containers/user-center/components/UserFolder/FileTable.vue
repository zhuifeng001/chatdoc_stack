<script setup lang="ts">
import type { UserFile } from '~/containers/knowledge-base/types'
import UserKBFolderMenu from '~/containers/user-center/components/user-kb/UserKBFolderMenu.vue'
import { useFileStore } from '~/containers/user-center/store/useFileStore'
import { debounce } from 'lodash-es'
import { isFailedFile, isParsingFile, isSucceedFile } from '~/containers/knowledge-base/store/helper'
import Warning from '../../images/Warning.vue'
import { Loading, LoadingFour } from '@icon-park/vue-next'
import FileIcon from './FileIcon.vue'
import FileEmpty from './FileEmpty.vue'

const router = useRouter()
const fileStore = useFileStore()
const { dataList, selectedRowKeys, loading, isSearchState } = storeToRefs(fileStore)

const vm = getCurrentInstance()?.proxy as any
const size = ref()
onMounted(() => {
  size.value = useElementSize(vm.$el)
})
const getWidthOfName = () => {
  if (!size.value?.width) return 300
  if (size.value.width < 740) return 200
  else if (size.value.width < 800) return 240
  else if (size.value.width < 900) return 300
  else if (size.value.width < 1000) return 400
  else return 500
}
const columns = computed(() => {
  return reactive([
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: getWidthOfName(),
      ellipsis: true,
      resizable: true
    },
    {
      title: '页数',
      dataIndex: 'page',
      key: 'page'
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size'
    },
    {
      title: '修改时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
      width: 180
    },
    {
      title: ' ',
      key: 'action',
      width: 56
    }
  ])
})

function handleResizeColumn(w, col) {
  col.width = w
}
function handleRowClick(record) {}

const onSelectChange = (_selectedRowKeys: (number | string)[], _selectedRows: UserFile[]) => {
  selectedRowKeys.value = _selectedRowKeys
  const idMap = selectedRowKeys.value.reduce((acc, cur) => {
    acc[cur] = true
    return acc
  }, {} as Record<number | string, boolean>)
  dataList.value.forEach(record => {
    record._checked = !!idMap[record.id]
  })
}

const nameRef = ref()
const fileRenameEdit = (record: Record<string, any>) => {
  record._edit = true
  setTimeout(() => {
    nameRef.value?.focus()
  })
}

const rename = debounce(
  async (record: Record<string, any>) => {
    const { data } = await fileStore.updateDocument(record.id, record.name)
    if (data.name) record.name = data.name
    record._edit = false
  },
  200,
  { leading: true, trailing: false }
)

const toAsk = record => {
  if (!isSucceedFile(record.status)) {
    return
  }
  const data = { ids: [record.id], personal: true }
  track({ name: `立即提问`, keyword: record.name, page: '个人知识库-表格列表' })
  router.push({ name: 'knowledge-base', state: { data: JSON.stringify(data) } })
}
</script>
<template>
  <a-spin :wrapper-class-name="$style['file-table']" :spinning="loading">
    <FileEmpty v-if="!dataList.length" :empty-text="isSearchState ? '未搜索到相关文件' : '暂无文件，请先上传'" />
    <a-table
      v-show="dataList.length"
      :class="$style['file-table']"
      :row-selection="{ selectedRowKeys: selectedRowKeys, onChange: onSelectChange, columnWidth: 44 }"
      :columns="columns"
      :data-source="dataList"
      :pagination="false"
      row-key="id"
      @resizeColumn="handleResizeColumn"
      @rowClick="handleRowClick"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <div :class="['flex items-center ml-[-8px] cursor-pointer']">
            <FileIcon :name="record.name" />
            <a-input
              v-if="record._edit"
              ref="nameRef"
              v-model:value="record.name"
              placeholder="请输入文件夹名称"
              size="small"
              @click.stop
              @pressEnter.stop="e => (e.target as HTMLElement)?.blur()"
              @blur="rename(record)"
            ></a-input>
            <div v-else class="inline-flex items-center overflow-hidden">
              <acg-tooltip placement="top" overlayClassName="acg-tooltip" :title="record.name" disabled>
                <a
                  :class="[
                    'inline-block text-ellipsis overflow-hidden text-nowrap',
                    isFailedFile(record.status) ? '!text-gray-400' : '',
                    isParsingFile(record.status) ? '!text-black' : ''
                  ]"
                  @click="toAsk(record)"
                >
                  {{ record.name }}
                </a>
              </acg-tooltip>
              <acg-tooltip
                v-if="isFailedFile(record.status)"
                placement="top"
                overlayClassName="acg-tooltip"
                title="文档解析失败"
              >
                <Warning class="inline-block ml-2 shrink-0 cursor-pointer @click.stop" />
              </acg-tooltip>
              <div v-else-if="isParsingFile(record.status)" class="flex items-center">
                <Loading
                  class="anticon-spin anticon-loading inline-block ml-2 mr-1 shrink-0 cursor-pointer primary-color"
                  @click.stop
                />
                <span :class="[$style['text-animation-text'], 'text-xs']">解析中...</span>
              </div>
            </div>
          </div>
        </template>
        <template v-if="column.key === 'size'">
          {{ record?.extraData?.documentSize ? formatDataSize(record?.extraData?.documentSize) + '' : '-' }}
        </template>
        <template v-else-if="column.key === 'page'">
          {{ record?.extraData?.pageNumber ? record?.extraData?.pageNumber + '页' : '-' }}
        </template>
        <template v-else-if="column.key === 'updateTime'">
          {{ formatDate(record?.updateTime) }}
        </template>
        <template v-else-if="column.key === 'action'">
          <UserKBFolderMenu
            position="relative"
            :class="$style['file-action']"
            :source="record"
            @file-rename-edit="fileRenameEdit(record)"
          />
        </template>
      </template>
    </a-table>
  </a-spin>
</template>
<style lang="less" module>
.file-table {
  height: 100%;
  min-height: 500px;

  :global(.ant-table-wrapper) {
    .ant-table-thead:after {
      content: '';
      display: block;
      height: 8px; /* 高度即为间距大小 */
      background-color: transparent; /* 根据需要设定背景颜色 */
    }

    .ant-table-thead > tr > th,
    .ant-table-thead > tr > td {
      background: #f2f4f7;
      border: none;
    }

    .ant-table-container table > thead > tr:first-child > *:first-child {
      border-top-left-radius: 4px;
      border-bottom-left-radius: 4px;
    }

    .ant-table-container table > thead > tr:first-child > *:last-child {
      border-top-right-radius: 4px;
      border-bottom-right-radius: 4px;
    }

    .ant-table .ant-table-tbody > tr > td {
      border-bottom: none;
      border-top: none;
    }

    .ant-table-tbody > tr.ant-table-row-selected > td {
      background: #f3f7ff;
    }
  }
}

@keyframes blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.text-animation-text {
  white-space: nowrap;
  animation: blink 1s linear infinite;
  transition: opacity 0.2s;
}
</style>
