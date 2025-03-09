<template>
  <ClientOnly>
    <div :class="$style['page-wrapper']">
      <div :class="$style['page-header']">
        <span :class="$style['header-title']">问答记录</span>
      </div>
      <SearchForm @onSearch="onSearch" />
      <TableData ref="table" />
    </div>
  </ClientOnly>
</template>
<script lang="ts" setup>
import SearchForm from './SearchForm.vue'
import TableData from './TableData.vue'
const table = ref()

const onSearch = params => {
  // console.log('params', params)
  table.value.search(params)
}
</script>
<style lang="less" module>
.page-wrapper {
  display: flex;
  flex-direction: column;
  background-color: #fff;
  height: calc(100% - 20px);
  width: calc(100% - 20px);
  padding: 20px 20px 0px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;

  .header-title {
    font-size: 16px;
    line-height: 24px;
    font-weight: bold;
  }
}
</style>
