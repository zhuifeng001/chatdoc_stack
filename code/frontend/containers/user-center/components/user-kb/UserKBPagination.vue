<template>
  <div :class="$style['user-kb-pagination']">
    <Pagination :current="pagination.current" :total="pagination.total" @change="onChange" />
  </div>
</template>
<script lang="ts" setup>
import Pagination from '@/components/common/Pagination/index.vue'
import type { PaginationProps } from 'ant-design-vue'
import { getDefaultPagination } from '~/components/common/Pagination/helper'
const current = ref(Math.floor(Math.random() * 10))
const props = defineProps({
  pagination: {
    type: Object as PropType<PaginationProps>,
    default: () => getDefaultPagination()
  }
})
const emit = defineEmits(['change'])

const onChange = (current: number, pageSize: number) => {
  props.pagination.current = current
  props.pagination.pageSize = pageSize
  emit('change', current, pageSize)
}
</script>
<style lang="less" module>
.user-kb-pagination {
  position: absolute;
  bottom: 0;
  right: 0;
  z-index: 10;
  width: 100%;
  height: 54px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0px -4px 8px 0px rgba(90, 118, 153, 0.06);
  border-radius: 0px 0px 4px 4px;
  backdrop-filter: blur(20px);

  padding: 12px 20px;
}
</style>
