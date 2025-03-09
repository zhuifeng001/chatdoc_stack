<template>
  <div :class="$style['user-kb-tabs-extra']">
    <div v-if="dataList?.length" :class="$style['fixed-module']">
      <a-checkbox v-model:checked="pageChecked" :indeterminate="pageCheckedIndeterminate"> 全选 </a-checkbox>
      <!-- <a-checkbox v-model:checked="openBatch"> 多选 </a-checkbox> -->
    </div>

    <BatchOperationModal />
  </div>
</template>
<script lang="ts" setup>
import { useFileStore } from '../../store/useFileStore'
import { useMyLibrary } from '../../store/useMyLibrary'
import BatchOperationModal from './BatchOperationModal.vue'

const fileStore = useFileStore()
const { pageChecked, pageCheckedIndeterminate, openBatch, dataList } = storeToRefs(fileStore)

const prop = defineProps({
  noSort: {
    type: Boolean
  },
  activeKey: {
    type: [Number, String]
  }
})
</script>
<style lang="less" module>
.user-kb-tabs-extra {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .fixed-module {
    user-select: none;
  }
}
</style>
