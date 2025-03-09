<template>
  <SearchBar ref="formRef" :class="$style['search-form']" :model="formState" @finish="onFinish">
    <SearchBarItem name="question" label="提问内容">
      <a-input
        v-model:value="formState['question']"
        placeholder="输入问题关键内容"
        allowClear
        @change="onFinish(formState)"
      />
    </SearchBarItem>
    <!-- <SearchBarItem name="document" label="文档名称">
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
        <template v-if="docListState.fetching" #notFoundContent>
          <a-spin size="small" />
        </template>
      </a-select>
    </SearchBarItem> -->
    <SearchBarItem name="createTime" label="提问时间">
      <a-range-picker
        v-model:value="formState.createTime"
        :allowEmpty="[true, true]"
        allowClear
        :disabledDate="disabledDate"
      />
    </SearchBarItem>
    <SearchBarItem last>
      <a-button @click="onReset">重置</a-button>
      <a-button type="primary" style="margin-left: 8px" html-type="submit">查询</a-button>
    </SearchBarItem>
  </SearchBar>
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
  createTime: []
})
const docListState = reactive({
  data: [],
  fetching: false
})

const onFinish = debounce(values => {
  emit('onSearch', {
    question: values.question || undefined,
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
