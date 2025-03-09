<template>
  <a-form ref="formRef" :class="$style['search-form']" :model="formState" @finish="onFinish">
    <a-row :gutter="20">
      <a-col :class="$style['form-item']">
        <a-form-item name="question" label="提问内容">
          <a-input
            v-model:value="formState['question']"
            placeholder="输入问题关键内容"
            allowClear
            @change="onFinish(formState)"
          />
        </a-form-item>
      </a-col>
      <a-col :class="$style['form-item']">
        <a-form-item name="document" label="文档名称">
          <a-select
            v-model:value="formState.document"
            show-search
            placeholder="输入文档名称"
            :options="docListState.data"
            :filter-option="false"
            :not-found-content="docListState.fetching ? undefined : null"
            allowClear
            @search="handleSearch"
            @change="onFinish(formState)"
          >
            <!-- @change="handleChange" -->
            <template v-if="docListState.fetching" #notFoundContent>
              <a-spin size="small" />
            </template>
          </a-select>
        </a-form-item>
      </a-col>
      <a-col :class="$style['form-item']">
        <a-form-item name="createTime" label="提问时间">
          <a-range-picker
            v-model:value="formState.createTime"
            :allowEmpty="[true, true]"
            allowClear
            :disabledDate="disabledDate"
          />
        </a-form-item>
      </a-col>
      <a-col>
        <a-button @click="onReset">重置</a-button>
        <a-button type="primary" style="margin-left: 8px" html-type="submit">查询</a-button>
      </a-col>
    </a-row>
  </a-form>
</template>
<script lang="ts" setup>
import type { Dayjs } from 'dayjs'
import { getDocumentByIds } from '~/api'
import SearchBar from '~/components/common/SearchBar/index.vue'
import SearchBarItem from '~/components/common/SearchBarItem/index.vue'
import { debounce } from 'lodash-es'

const emit = defineEmits<{ (e: 'onSearch', params: Record<string, any>) }>()

const formRef = ref()
const formState = ref({
  question: '',
  document: undefined,
  createTime: [] as any
})
const docListState = reactive({
  data: [],
  fetching: false
})

const onFinish = debounce(values => {
  // console.log('values', values)
  emit('onSearch', {
    question: values.question || undefined,
    // documentIds:
    // Array.isArray(values.document) && values.document.length ? values.document  : undefined,
    documentIds: values.document ? [values.document] : undefined,
    createTime:
      values.createTime?.length === 2
        ? values.createTime?.map((val: Dayjs, i) =>
            val ? (i ? val.endOf('day').toDate() : val.startOf('day').toDate()) : null
          )
        : undefined
  })
}, 500)

const onReset = () => {
  formRef.value?.form.resetFields()
  emit('onSearch', { question: undefined, documentIds: undefined, createTime: undefined })
}

const handleSearch = useDebounceFn(async (val: string) => {
  docListState.fetching = true
  const { data } = await getDocumentByIds({ filename: val })
  docListState.data = data.map(o => ({ label: o.name, value: o.id }))
  docListState.fetching = false
}, 500)

// const handleChange = v => {
//   setTimeout(() => {
//     const tagItemElements = document.querySelectorAll('.ant-select-selection-overflow-item-rest .ant-select-selection-item');
//     tagItemElements.forEach(element => {
//       element.removeAttribute('title');
//     });
//   }, 2000);
// }
</script>
<style lang="less" module>
.search-form {
  .form-item {
    flex: 1 1 calc((100% - 156px) / 3);
    overflow: hidden;
  }

  :global {
    .ant-form-item {
      margin-bottom: 20px;
    }

    .ant-picker {
      width: 100%;
    }

    .ant-btn {
      min-width: 64px;
    }

    .ant-select {
      max-width: none;
    }
  }
}
</style>
