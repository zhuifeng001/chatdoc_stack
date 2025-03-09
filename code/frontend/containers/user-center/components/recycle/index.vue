<template>
  <div :class="$style['page-wrapper']">
    <div :class="$style['page-header']">
      <span :class="$style['header-title']">回收站</span>
      <a-input
        :class="$style['user-kb-search-input']"
        v-model:value="keyword"
        :placeholder="'查找内容'"
        allow-clear
        @pressEnter="onSearch"
      >
        <template #prefix>
          <loading-outlined v-if="loading" />
          <Search v-else :class="$style['search-icon']" src="" alt="搜索" @click="onSearch" />
        </template>
      </a-input>
    </div>
    <a-alert
      message="提示"
      description="在知识库中删除的文件会默认加入回收站，30日内可恢复，超过30日将彻底被删除"
      type="info"
      show-icon
      :class="$style['page-tips']"
    >
      <template #icon><info-circle-filled /></template>
    </a-alert>
    <a-tabs v-model:activeKey="activeKey" destroyInactiveTabPane>
      <a-tab-pane key="1" tab="全部">
        <CardRecord :data="dataResult" @getData="getData" />
      </a-tab-pane>
      <a-tab-pane key="2" tab="最近删除" force-render>
        <CardRecord :data="dataResult" @getData="getData" />
      </a-tab-pane>
      <template #rightExtra>
        <UserKBTabsExtra />
      </template>
    </a-tabs>
    <div id="pagination" :class="$style.pagination"></div>
  </div>
</template>
<script lang="ts" setup>
import { LoadingOutlined, InfoCircleFilled } from '@ant-design/icons-vue'
import Search from '@/containers/knowledge-base/images/search.vue'
import UserKBTabsExtra from '../user-kb/UserKBTabsExtra.vue'
import CardRecord from './CardRecord.vue'
import { getRecycleRecords } from '~/api'

const keyword = ref<string>()
const loading = ref<boolean>(false)
const activeKey = ref<string>('1')
const dataResult = ref({ total: 0, list: [] })

const onSearch = () => {}

const getData = async params => {
  const { data } = await getRecycleRecords()
  const typeMap = { 1: 'library', 2: 'folder', 3: 'document' }
  dataResult.value = {
    list: data.list.map(item => ({ ...item, name: item.source.name, _type: typeMap[item.source.type] })),
    total: data.total
  }
}
</script>
<style lang="less" module>
.page-wrapper {
  background-color: #fff;
  height: calc(100% - 20px);
  width: calc(100% - 20px);
  padding: 20px 20px 12px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;

  .header-title {
    font-size: 16px;
    line-height: 24px;
    font-weight: bold;
  }

  .user-kb-search-input {
    padding: 5px 7px 5px 26px;
    width: 200px;
    background: #ffffff;
    border-radius: 2px;

    :global {
      .ant-input-prefix {
        position: absolute;
        left: 7px;
        top: 8px;
        width: 16px;
        height: 16px;
        z-index: 1;
        color: #868d9b;

        display: flex;
        justify-content: center;
        align-items: center;
      }
    }

    .search-icon {
      color: var(--text-gray-color);
    }
  }
}

.page-tips {
  margin-bottom: 4px;
  padding: 8px 12px;
  line-height: 20px;
  :global {
    .ant-alert-icon {
      margin-right: 8px;
      font-size: 18px;
    }
    .ant-alert-description {
      color: var(--text-gray-color);
    }
  }
}

.pagination {
  width: 100%;
}
</style>
