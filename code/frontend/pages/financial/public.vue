<template>
  <PageLayout :class="$style['financial-page']">
    <!-- <template v-slot:top>
      <div :class="$style['financial-bg']">
        <NuxtImg format="webp" src="/assets/images/financial/bg.jpg" sizes="1920px 1080px" />
      </div>
    </template> -->
    <div :class="$style['financial-container']">
      <FinancialIntro />
      <SearchCenter></SearchCenter>
      <!-- <HotIndustry style="margin: 40px 0 30px 0" /> -->
      <SearchCondition :industriesData="industriesData" :reportTypesData="reportTypesData" />
      <div :class="$style['document-list-wrapper']">
        <DocumentList :list="homeList" :row="row" />
        <DocumentSearchEmpty v-show="!homeList.length" subtitle="您可以试试其他搜索条件" />
      </div>
      <ClientOnly>
        <Pagination
          v-show="homeList.length"
          :current="homePagination.current"
          :page-size="homePagination.pageSize"
          :total="homePagination.total"
          @change="financialStore.onChangeDocPagination"
        />
      </ClientOnly>
    </div>
    <Teleport to="body">
      <SelectedDocumentList />
    </Teleport>
  </PageLayout>
</template>

<script lang="ts" setup>
import PageLayout from '@/containers/financial/components/layout/PageLayout.vue'
import FinancialIntro from '@/containers/financial/components/home/FinancialIntro.vue'
import SearchCenter from '@/containers/financial/components/home/SearchCenter.vue'
import HotIndustry from '@/containers/financial/components/home/HotIndustry.vue'
import SearchCondition from '@/containers/financial/components/home/SearchCondition.vue'
import DocumentList from '@/containers/financial/components/home/DocumentList.vue'
import SelectedDocumentList from '@/containers/financial/components/home/SelectedDocumentList.vue'
import Pagination from '@/components/common/Pagination/index.vue'
import { useFinancialStore } from '~/containers/financial/store'
import { useRowSize } from '~/containers/financial/store/useRowSize'
import DocumentSearchEmpty from '~/containers/financial/components/search/DocumentSearchEmpty.vue'

const financialStore = useFinancialStore()
const { homeList, homePagination, industriesData, reportTypesData, selectedDocumentModalVisible } =
  storeToRefs(financialStore)

useAsyncData('financial-home', financialStore.getDocListByHome)

useAsyncData('hotSpotsData', financialStore.getHotSpotsData)

useAsyncData('filterSource', financialStore.getFilterSource)

onMounted(() => {
  financialStore.initCache()
  financialStore.initSelectedState()
  if (!homeList.value?.length) {
    financialStore.getDocListByHome()
  }
  selectedDocumentModalVisible.value = true
})

onBeforeUnmount(() => {
  selectedDocumentModalVisible.value = false
})

onActivated(() => {
  selectedDocumentModalVisible.value = true
})

onDeactivated(() => {
  financialStore.onCancel()
  selectedDocumentModalVisible.value = false
})

const { row } = useRowSize()
</script>

<style lang="less" module>
.financial-page {
}
.financial-container {
  position: relative;
  padding: 60px 0 60px;
}
.financial-bg {
  position: absolute;
  left: 0;
  top: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  backdrop-filter: blur(29px);
  // background: url('/assets/images/financial/bg.jpg') no-repeat top / 100% 100%;

  img {
    width: 100%;
    height: 100%;
  }
}
.document-list-wrapper {
  margin-top: 20px;
  margin-bottom: 20px;
}
</style>
