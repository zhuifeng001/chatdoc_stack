<template>
  <PageLayout :class="$style['financial-search-page']" :wrapperClass="$style['financial-container']">
    <template v-slot:top>
      <div :class="$style['financial-search-header']">
        <FinancialSearch @search="onSearch"></FinancialSearch>
      </div>
    </template>

    <div :class="$style['financial-search-form']">
      <SearchCondition :isHome="false" :reportTypesData="reportTypesData" />
    </div>
    <div :class="$style['document-list-wrapper']">
      <DocumentDummy v-show="searchStatus === SearchStatusEnums.START" :row="row" />
      <DocumentList
        v-show="searchStatus === SearchStatusEnums.SUCCESS && searchList.length"
        :list="searchList"
        :row="row"
      />
      <DocumentSearchEmpty v-show="searchStatus === SearchStatusEnums.SUCCESS && !searchList.length" />
    </div>
    <ClientOnly>
      <Pagination
        v-show="searchList.length"
        :current="searchPagination.current"
        :page-size="searchPagination.pageSize"
        :total="searchPagination.total"
        @change="financialStore.onChangeSearchDocPagination"
      />
    </ClientOnly>
    <!-- <HotIndustry style="margin: 60px 0 0 0" /> -->
    <Teleport to="body">
      <SelectedDocumentList />
    </Teleport>
  </PageLayout>
</template>

<script lang="ts" setup>
import PageLayout from '@/containers/financial/components/layout/PageLayout.vue'
import FinancialSearch from '@/containers/financial/components/search/FinancialSearch.vue'
import HotIndustry from '@/containers/financial/components/home/HotIndustry.vue'
// import SearchCondition2 from '@/containers/financial/components/search/SearchCondition2.vue'
import SearchCondition from '@/containers/financial/components/home/SearchCondition.vue'
import DocumentDummy from '@/containers/financial/components/home/DocumentDummy.vue'
import DocumentList from '@/containers/financial/components/home/DocumentList.vue'
import DocumentSearchEmpty from '@/containers/financial/components/search/DocumentSearchEmpty.vue'
import Pagination from '@/components/common/Pagination/index.vue'
import SelectedDocumentList from '@/containers/financial/components/home/SelectedDocumentList.vue'
import { useFinancialStore, SearchStatusEnums } from '~/containers/financial/store'
import { useRowSize } from '~/containers/financial/store/useRowSize'

const financialStore = useFinancialStore()
const { searchCondition, searchList, searchPagination, searchStatus, reportTypesData, selectedDocumentModalVisible } =
  storeToRefs(financialStore)

useAsyncData('hotSpotsData', financialStore.getHotSpotsData)

useAsyncData('filterSource', financialStore.getFilterSource)

const route = useRoute()

useAsyncData('financial/search', ctx => {
  const keyword = route.query.keyword
  searchCondition.value.keywords = keyword ? String(keyword) : ''
  return financialStore.getDocListBySearch()
})

onMounted(() => {
  selectedDocumentModalVisible.value = true
  financialStore.initCache()
  financialStore.initSelectedState()
  if (!searchList.value?.length) {
    const keyword = route.query.keyword
    searchCondition.value.keywords = keyword ? String(keyword) : ''
    // return financialStore.getDocListBySearch()
  }
})

const onSearch = (keywords: string) => {
  searchCondition.value.keywords = keywords
  searchPagination.value.current = 1
  financialStore.getDocListBySearch()
}

// onBeforeMount 初始化会默认触发 bug
onUnmounted(() => {
  searchCondition.value.industry = []
  searchCondition.value.financeType = []
  searchCondition.value.financeDate = []
  searchList.value = []
  searchPagination.value.current = 1
  searchPagination.value.total = 0
  financialStore.initSelectedState()
  financialStore.onCancel()
})

onBeforeUnmount(() => {
  selectedDocumentModalVisible.value = true
})

/**
 * 页面未缓存，不会触发
 */
onActivated(() => {
  selectedDocumentModalVisible.value = true
})

onDeactivated(() => {
  financialStore.initSelectedState()
  financialStore.onCancel()
  selectedDocumentModalVisible.value = false
})

const { row } = useRowSize()
</script>

<style lang="less" module>
.financial-search-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.financial-container {
  position: relative;
  z-index: 1;
  padding: 0 0 60px;
  background: linear-gradient(198deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0) 100%),
    linear-gradient(360deg, #f2f4f7 0%, #ffffff 100%);
  backdrop-filter: blur(29px);
  flex-grow: 1;
}

.financial-search-header {
  position: relative;
  z-index: 1;
  padding: 60px 0 16px;
  width: 100%;
  // background: #fff;
}

.financial-search-form {
  padding-top: 20px;
  margin-bottom: 16px;
  :global {
    .ant-col-xxl-6 {
      min-width: 240px;
    }
    .ant-form-item-label {
      min-width: 65px;
    }
    .ant-form-item-control {
      min-width: 150px;
    }
  }
}

.document-list-wrapper {
  min-height: 300px;
  margin-top: 20px;
  margin-bottom: 20px;
}
</style>
