<template>
  <ClientOnly>
    <SearchBar class="" ref="SearchBarRef" :model="searchCondition">
      <SearchBarItem label="报告类型">
        <a-select
          placeholder="全部"
          v-model:value="searchCondition.financeType"
          @change="onSearch"
          mode="multiple"
          :options="reportTypeOptions"
          allow-clear
        >
        </a-select>
      </SearchBarItem>
      <SearchBarItem label="报告时间">
        <a-range-picker
          class="w-100"
          picker="month"
          v-model:value="searchCondition.financeDate"
          :disabledDate="disabledDate"
          @change="onSearch"
          :allowEmpty="[true, true]"
        />
      </SearchBarItem>
      <SearchBarItem last>
        <a-checkbox
          v-model:checked="pageChecked"
          :indeterminate="pageCheckedIndeterminate"
          @change="onCurrentPageChecked"
        >
          本页全选
        </a-checkbox>
      </SearchBarItem>
      <BatchOperationModal />
    </SearchBar>
  </ClientOnly>
</template>
<script lang="ts" setup>
import BatchOperationModal from '@/containers/financial/components/search/BatchOperationModal.vue'
import SearchBar from '@/components/common/SearchBar/index.vue'
import SearchBarItem from '@/components/common/SearchBarItem/index.vue'
import { useFinancialStore } from '../../store'

const SearchBarRef = ref()

const financialStore = useFinancialStore()
const { searchCondition, pageChecked, pageCheckedIndeterminate, reportTypesData } = storeToRefs(financialStore)

const reportTypeOptions = reactive([
  ...reportTypesData.value.map(o => ({
    label: o.name,
    value: o.value
  }))
])

const onCurrentPageChecked = (e: any) => {
  // console.log(e)
}

const onSearch = () => {
  searchCondition.value.financeType = searchCondition.value.financeType?.filter(o => o !== '') // 过滤全部
  financialStore.getDocListBySearch()
}
</script>
<style lang="less" module></style>
