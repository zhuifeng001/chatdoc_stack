<template>
  <ClientOnly>
    <div :class="$style['user-kb-folder-file']">
      <template v-for="source in dataList" :key="source.id">
        <UserKBFolder v-if="source._type === 'folder'" :source="source" />
        <UserKBFile v-else :source="source" />
      </template>
      <Teleport to="#pagination">
        <UserKBPagination :pagination="dataListPagination" @change="onPageChange" />
      </Teleport>
    </div>
  </ClientOnly>
</template>
<script lang="ts" setup>
import UserKBFolder from '../user-kb/UserKBFolder.vue'
import UserKBFile from '../user-kb/UserKBFile.vue'
import UserKBPagination from '../user-kb/UserKBPagination.vue'
import { getDefaultPagination } from '~/components/common/Pagination/helper'

const props = defineProps<{ data: { list: any[]; total: number } }>()
const { data } = toRefs(props)
const emit = defineEmits<{ (e: 'getData', params: Record<string, any>): void }>()

const dataListPagination = getDefaultPagination()
const dataList = ref<any[]>([])

onMounted(() => {
  getData({ page: dataListPagination.current - 1, pageSize: dataListPagination.pageSize })
})

watch([data], () => {
  dataList.value = props.data?.list
  console.log('dataList.value', dataList.value)
})

const getData = async (params: any = {}) => {
  emit('getData', {
    ...params,
    sort: 'recentUpdate',
    sortType: 'ASC'
  })
}

const onPageChange = (current, pageSize) => {
  getData({ page: current - 1, pageSize })
}
</script>
<style lang="less" module>
.user-kb-folder-file {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
</style>
