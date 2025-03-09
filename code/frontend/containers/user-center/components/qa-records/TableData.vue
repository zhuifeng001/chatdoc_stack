<template>
  <a-table
    :class="$style['table-data']"
    tableLayout="fixed"
    :columns="columns"
    :row-key="record => record.id"
    :data-source="dataSource"
    :pagination="pagination"
    :loading="loading"
    :scroll="{ y: true }"
    @change="handleTableChange"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.dataIndex === 'filename'">
        <div :class="$style['tag-box']">
          <a-tag :class="$style['tag-item']" v-if="record.list[0]" :title="record.list[0].name">
            {{ record.list[0].name }}</a-tag
          >
          <a-tooltip color="#fff" :overlayClassName="$style['tooltip-wrapper']">
            <a-tag :class="$style['tag-item']" v-if="record.list.length > 1">...</a-tag>
            <template v-slot:title>
              <a-tag
                :class="[$style['tag-item'], $style['tooltip-tag']]"
                v-for="tag in record.list.slice(1)"
                :key="tag.id"
                :title="tag.name"
              >
                {{ tag.name }}
              </a-tag>
            </template>
          </a-tooltip>
        </div>
      </template>
      <template v-if="column.dataIndex === 'createTime'">
        <span>{{ formatDate(record.createTime) }}</span>
      </template>
      <template v-else-if="column.dataIndex === 'action'">
        <span :class="record.list.length ? '' : $style['forbid-view']">
          <a @click="viewRecord(record)">查看</a>
          <!-- <a-divider type="vertical" />
          <a>删除</a> -->
        </span>
      </template>
    </template>
  </a-table>
</template>
<script lang="ts" setup>
import { getQaRecords } from '~/api'
import { ChatTypeEnums } from '../../helpers'

const router = useRouter()

defineExpose({
  search: params => {
    getData({ ...filterParams.value, ...params, page: 1 })
  }
})

const columns = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 100
  },
  {
    title: '提问内容',
    dataIndex: 'content',
    width: '30%'
  },
  {
    title: '文档名称',
    dataIndex: 'filename',
    width: '30%'
  },
  {
    title: '提问时间',
    dataIndex: 'createTime',
    sorter: true
  },
  {
    title: '操作',
    dataIndex: 'action',
    width: '150px'
  }
]
const filterParams = ref({})
const dataSource = ref([])
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
  showTotal: total => `共 ${total} 条`,
  showQuickJumper: true,
  showSizeChanger: true
})
const loading = ref(true)

onMounted(() => {
  getData({ page: 1, pageSize: 20 })
})

const getData = async params => {
  loading.value = true
  const { data } = await getQaRecords({ ...params, chatType: ChatTypeEnums.Document })
  dataSource.value = data.list.map(item => {
    item.list = [...(item.folders.filter(Boolean) || []), ...(item.documents.filter(Boolean) || [])]
    return item
  })
  pagination.value.total = data.total
  pagination.value.pageSize = params.pageSize
  pagination.value.current = params.page
  loading.value = false
  filterParams.value = params
}

const handleTableChange = ({ current, pageSize }, _, sorter) => {
  const params: Record<string, any> = { page: current, pageSize, sort: undefined }
  if (sorter?.order) {
    params.sort = { [sorter.field]: sorter.order === 'ascend' ? 'ASC' : 'DESC' }
  }
  getData({ ...filterParams.value, ...params })
}

const viewRecord = record => {
  if (!record?.list?.length) return
  const { folderIds, ids } = record.context || {}
  router.push({
    name: 'knowledge-base',
    state: {
      data: JSON.stringify({
        folderIds,
        ids,
        chatId: record.chatId,
        recordId: record.id,
        from: 'record',
        personal: record.documents[0]?.type === 1 // 个人知识库
      })
    }
  })
}
</script>
<style lang="less" module>
.table-data {
  margin: 0 -20px;
  padding: 0 20px;
  max-width: calc(100% + 40px);
  flex: 1 1 auto;
  overflow: hidden;
  :global {
    .ant-spin-nested-loading,
    .ant-spin-container {
      height: 100%;
    }
    .ant-table {
      height: calc(100% - 54px);
      .ant-table-container {
        height: 100%;
        .ant-table-body {
          height: calc(100% - 56px);
        }
      }
    }
    .ant-table-thead {
      .ant-table-cell {
        padding: 16px 20px;
        line-height: 22px;
      }
    }
    .ant-table-tbody {
      .ant-table-cell {
        padding: 12px 20px;
        line-height: 20px;
      }
      .ant-table-row:last-child .ant-table-cell {
        border-bottom: 0;
      }
    }

    .ant-table-pagination {
      position: absolute;
      height: 54px;
      padding: 12px 20px;
      margin: 0;
      bottom: 0;
      right: -20px;
      left: -20px;
      z-index: 10;
      background: rgba(255, 255, 255, 0.7);
      box-shadow: 0px -4px 8px 0px rgba(90, 118, 153, 0.06);
      border-radius: 0px 0px 4px 4px;
      backdrop-filter: blur(20px);
      .ant-pagination-total-text {
        position: absolute;
        left: 20px;
        top: 12px;
      }
    }
  }
}

.forbid-view {
  a {
    color: #8c8c8c;
    cursor: not-allowed;
  }
  &:hover {
    a {
      color: #8c8c8c;
      cursor: not-allowed;
    }
  }
}
.tag-box {
  display: flex;

  .tag-item {
    max-width: calc(100% - 50px);
    // max-width: 100%;
    display: inline-block;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
.tag-item {
  margin-right: 4px;
  padding: 4px 8px;
  line-height: 20px;
  color: var(--text-gray-color);
  background-color: #f2f4f7;
  border-color: #ccd0d9;
  display: inline-flex;

  &.tooltip-tag {
    margin: 4px;
  }
}
.tooltip-wrapper {
  max-width: unset;

  :global {
    .ant-tooltip-inner {
      max-height: 300px;
      overflow-y: auto;
      padding: 4px 4px;
      display: flex;
      flex-direction: column;
      // justify-content: flex-start;
      align-items: flex-start;
    }
  }
}
</style>
