<script setup lang="ts">
import { useFileStore } from '~/containers/user-center/store/useFileStore'
import ViewBoxIcon from '../../images/ViewBoxIcon.vue'
import ViewTableIcon from '../../images/ViewTableIcon.vue'
import { ViewTypeEnums } from './helper'

const props = defineProps({
  view: {
    type: String as PropType<ViewTypeEnums>,
    required: true,
    default: 'list'
  }
})
const emit = defineEmits(['update:view'])

const fileStore = useFileStore()
const { pageChecked, pageCheckedIndeterminate, openBatch, dataList } = storeToRefs(fileStore)
const onChangeView = (view: ViewTypeEnums) => {
  emit('update:view', view)
  fileStore.onCancelSelected()
}
</script>

<template>
  <div class="p-5 flex justify-between border-b h-[61px]">
    <span class="text-lg font-semibold leading-5">文件</span>
    <div class="flex">
      <a-checkbox
        class="flex items-center"
        v-if="props.view === ViewTypeEnums.GRID && dataList?.length"
        v-model:checked="pageChecked"
        :indeterminate="pageCheckedIndeterminate"
      >
        全选
      </a-checkbox>

      <ViewBoxIcon
        :class="['cursor-pointer transition-all', props.view === ViewTypeEnums.GRID ? 'primary-color' : '']"
        @click="onChangeView(props.view === ViewTypeEnums.TABLE ? ViewTypeEnums.GRID : ViewTypeEnums.TABLE)"
      />

      <ViewTableIcon
        :class="['cursor-pointer ml-2 mr-3 transition-all', props.view === ViewTypeEnums.TABLE ? 'primary-color' : '']"
        @click="onChangeView(props.view === ViewTypeEnums.TABLE ? ViewTypeEnums.GRID : ViewTypeEnums.TABLE)"
      />
    </div>
  </div>
</template>
