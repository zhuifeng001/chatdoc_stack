<script setup lang="ts">
import BatchOperationModal from '~/containers/user-center/components/user-kb/BatchOperationModal.vue'
import FileHeader from './FileHeader.vue'
import FileTable from './FileTable.vue'
import UserKBFolderFile from '~/containers/user-center/components/user-kb/UserKBFolderFile.vue'
import { ViewTypeEnums } from './helper'
import { useFileStore } from '~/containers/user-center/store/useFileStore'
import UserKBFolderSelect from '~/containers/user-center/components/user-kb/UserKBFolderSelect.vue'

const viewType = useLocalStorage<ViewTypeEnums>('file-view-type', ViewTypeEnums.GRID) // ref<ViewTypeEnums>(ViewTypeEnums.GRID)
const fileStore = useFileStore()
const { dataList, loading, isSearchState, selectedFolder, folderSelectVisible } = storeToRefs(fileStore)

onBeforeUnmount(() => {
  fileStore.onCancelSelected()
})
</script>

<template>
  <div :class="$style['file-list-wrapper']">
    <FileHeader v-model:view="viewType" />

    <div :class="[$style['file-list-container'], 'scroll-bar px-5 py-3']">
      <FileTable v-if="viewType === ViewTypeEnums.TABLE" />
      <UserKBFolderFile v-if="viewType === ViewTypeEnums.GRID" class="mt-2" />
    </div>

    <BatchOperationModal />

    <UserKBFolderSelect
      v-if="selectedFolder"
      v-model:folderSelectVisible="folderSelectVisible"
      @fileMove="fileStore.batchMoveFiles"
    />
  </div>
</template>
<style lang="less" module>
.file-list-wrapper {
  height: 100%;

  .file-list-container {
    height: calc(100% - 61px);
  }

  .empty-box {
    width: 100%;
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: var(--text-gray-color);
  }
}
</style>
