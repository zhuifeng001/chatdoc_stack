<template>
  <div :class="$style['search-condition']">
    <!-- <div :class="$style['label']" v-if="isHome">发现报告</div> -->
    <div :class="$style['condition-wrapper']">
      <div :class="$style['condition-item']" v-if="isHome && industriesData?.length > 1">
        <div :class="$style['condition-label']">行业过滤</div>
        <div :class="$style['condition-value']">
          <span
            :class="[$style['condition-piece'], !formState.industry?.length ? $style['active'] : '']"
            @click="onSelectIndustry()"
          >
            全部
          </span>
          <span
            :class="[$style['condition-piece'], formState.industry.includes(industry.value) ? $style['active'] : '']"
            v-for="industry in industriesData"
            :key="industry.value"
            @click="onSelectIndustry(industry.value)"
          >
            {{ industry.name }}
          </span>
        </div>
      </div>
      <div :class="$style['condition-item']" v-if="conceptData?.length > 1">
        <div :class="$style['condition-label']">热门概念</div>
        <div :class="$style['condition-value']">
          <span
            :class="[$style['condition-piece'], !formState.concept?.length ? $style['active'] : '']"
            @click="onSelectConcept()"
          >
            全部
          </span>
          <span
            :class="[$style['condition-piece'], formState.concept.includes(concept.value) ? $style['active'] : '']"
            v-for="concept in conceptData"
            :key="concept.value"
            @click="onSelectConcept(concept.value)"
          >
            {{ concept.name }}
          </span>
        </div>
      </div>
      <div :class="$style['condition-item']" v-if="reportTypesData?.length > 1">
        <div :class="$style['condition-label']">报告类型</div>
        <div :class="$style['condition-value']">
          <span
            :class="[$style['condition-piece'], !formState.financeType?.length ? $style['active'] : '']"
            @click="onSelectReportType()"
          >
            全部
          </span>
          <span
            :class="[
              $style['condition-piece'],
              formState.financeType.includes(reportType.value) ? $style['active'] : ''
            ]"
            v-for="reportType in reportTypesData"
            :key="reportType.value"
            @click="onSelectReportType(reportType.value)"
          >
            {{ reportType.name }}
          </span>
        </div>
      </div>
      <div :class="[$style['condition-item'], $style['time-search']]">
        <div :class="$style['condition-label']">报告时间</div>
        <div :class="$style['condition-value']">
          <span
            :class="[
              $style['condition-piece'],
              formState.financeDateType === FixedDateEnums.ALL ? $style['active'] : ''
            ]"
            @click="onFinanceDateType(FixedDateEnums.ALL)"
          >
            全部
          </span>
          <span
            :class="[$style['condition-piece'], formState.financeDateType === item.value ? $style['active'] : '']"
            v-for="item in FixedDateOptions"
            :key="item.value"
            @click="onFinanceDateType(item.value)"
          >
            {{ item.name }}
          </span>
          <a-range-picker
            class="w-100"
            picker="month"
            v-model:value="formState.financeDate"
            :disabledDate="disabledDate"
            @change="onSearch"
            :allowEmpty="[true, true]"
            @click="formState.financeDateType = FixedDateEnums.CUSTOM"
          />
        </div>
      </div>
    </div>
    <div :class="$style['fixed-module']">
      <span v-show="showReset" :class="$style['reset']" @click="resetCondition" href="javascript:void(0)"> 重置 </span>
      <a-checkbox
        v-model:checked="pageChecked"
        :indeterminate="pageCheckedIndeterminate"
        @change="onCurrentPageChecked"
      >
        本页全选
      </a-checkbox>
    </div>

    <BatchOperationModal />
  </div>
</template>
<script lang="ts" setup>
import dayjs from 'dayjs'
import { FixedDateEnums } from '../../helpers'
import { useFinancialStore } from '../../store'
import BatchOperationModal from '@/containers/financial/components/search/BatchOperationModal.vue'

const props = defineProps({
  isHome: {
    type: Boolean,
    default: true
  },
  industriesData: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  reportTypesData: {
    type: Array as PropType<any[]>,
    default: () => []
  }
})

const financialStore = useFinancialStore()
const {
  industriesData,
  reportTypesData,
  conceptData,
  homeCondition,
  searchCondition,
  homePagination,
  searchPagination,
  pageChecked,
  pageCheckedIndeterminate
} = storeToRefs(financialStore)

const formState = props.isHome ? homeCondition : searchCondition
const pageName = props.isHome ? '首页' : '搜索页'
const getDocList = props.isHome ? financialStore.getDocListByHome : financialStore.getDocListBySearch
const currentPagination = props.isHome ? homePagination : searchPagination
const background = props.isHome ? '#f2f5fa' : '#fff'

const onSelectIndustry = (value?: string) => {
  if (value == null) {
    formState.value.industry = []
  } else {
    const index = formState.value.industry.indexOf(value)
    if (index !== -1) {
      formState.value.industry.splice(index, 1)
    } else {
      // formState.value.industry.push(value) // 多选
      formState.value.industry = [value] // 单选
    }
  }
  currentPagination.value.current = 1
  getDocList()
  track({
    name: `文档搜索`,
    keyword: industriesData.value.find(o => o.value === value)?.name || '全部',
    page: pageName,
    filter: '行业'
  })
}
const onSelectReportType = (value?: string) => {
  if (value == null) {
    formState.value.financeType = []
  } else {
    const index = formState.value.financeType.indexOf(value)
    if (index !== -1) {
      formState.value.financeType.splice(index, 1)
    } else {
      // formState.value.financeType.push(value)// 多选
      formState.value.financeType = [value] // 单选
    }
  }
  currentPagination.value.current = 1
  getDocList()
  track({
    name: `文档搜索`,
    keyword: reportTypesData.value.find(o => o.value === value)?.name || '全部',
    page: pageName,
    filter: '报告类型'
  })
}
const onSelectConcept = (value?: string) => {
  if (value == null) {
    formState.value.concept = []
  } else {
    const index = formState.value.concept.indexOf(value)
    if (index !== -1) {
      formState.value.concept.splice(index, 1)
    } else {
      // formState.value.concept.push(value)// 多选
      formState.value.concept = [value] // 单选
    }
  }
  currentPagination.value.current = 1
  getDocList()
}

const FixedDateOptions = [
  // { name: '最近三个月', value: FixedDateEnums.THREE_MONTH },
  { name: '最近半年', value: FixedDateEnums.SIX_MONTH },
  { name: '最近一年', value: FixedDateEnums.ONE_YEAR },
  { name: '最近两年', value: FixedDateEnums.TWO_YEAR }
]
const onFinanceDateType = (value: FixedDateEnums) => {
  if (formState.value.financeDateType == value) {
    value = FixedDateEnums.ALL
  }

  if (value === FixedDateEnums.THREE_MONTH) {
    formState.value.financeDate = [dayjs().subtract(3, 'months'), dayjs()]
  } else if (value === FixedDateEnums.SIX_MONTH) {
    formState.value.financeDate = [dayjs().subtract(6, 'months'), dayjs()]
  } else if (value === FixedDateEnums.ONE_YEAR) {
    formState.value.financeDate = [dayjs().subtract(1, 'years'), dayjs()]
  } else if (value === FixedDateEnums.TWO_YEAR) {
    formState.value.financeDate = [dayjs().subtract(2, 'years'), dayjs()]
  } else {
    formState.value.financeDate = []
  }
  formState.value.financeDateType = value
  currentPagination.value.current = 1
  getDocList()
  track({
    name: `文档搜索`,
    keyword: formState.value.financeDate?.map(o => dayjs(o).format('YYYY-MM-DD'))?.join('~') || '全部',
    page: pageName,
    filter: '时间'
  })
}
const onSearch = v => {
  if (v == null) {
    formState.value.financeDateType = FixedDateEnums.ALL
  }
  getDocList()
}
const onCurrentPageChecked = (e: any) => {
  // console.log(e)
}
const showReset = computed(() => {
  return (
    formState.value.concept.length > 0 ||
    formState.value.industry.length > 0 ||
    formState.value.financeType.length > 0 ||
    formState.value.financeDate?.length > 0 ||
    formState.value.financeDateType !== FixedDateEnums.ALL
  )
})
const resetCondition = () => {
  formState.value.concept = []
  formState.value.industry = []
  formState.value.financeType = []
  formState.value.financeDate = []
  formState.value.financeDateType = FixedDateEnums.ALL
  currentPagination.value.current = 1
  getDocList()
}
</script>
<style lang="less" module>
.search-condition {
  position: relative;

  .label {
    margin-bottom: 12px;
    font-size: 18px;
    font-weight: 500;
    color: #000000;
    line-height: 24px;
  }

  .condition-wrapper {
    padding: 20px;
    background: v-bind(background);
    border-radius: 4px;
  }
  .condition-item {
    display: flex;
    align-items: flex-start;

    .condition-label {
      margin-right: 20px;
      flex: 0 0 60px;
    }
    .condition-value {
      display: flex;
      align-items: center;
      flex-wrap: wrap;

      .condition-piece {
        display: inline-block;
        margin-bottom: 6px;
        margin-right: 12px;
        padding: 2px 4px;
        font-size: 14px;
        font-weight: 400;
        color: #475266;
        line-height: 20px;
        cursor: pointer;

        &:hover {
          color: var(--primary-color);
        }

        &.active {
          background: #e0ebff;
          color: var(--primary-color);
        }
      }
    }

    &.time-search {
      // margin-top: 4px;
      align-items: stretch;

      .condition-label {
        display: flex;
        align-items: center;
      }

      .condition-value {
        .condition-piece {
          margin-top: 6px;
        }
      }
    }
  }

  .fixed-module {
    position: absolute;
    right: 10px;
    bottom: 16px;
    color: #475266;

    .reset {
      margin-right: 10px;
      color: #475266;

      &:hover {
        color: var(--primary-color);
        cursor: pointer;
      }
    }
  }
}
</style>
