<template>
  <div :class="$style['user-kb-tools']">
    <!-- <div :class="$style['new-folder']" @click="addFolder">
      <img :class="$style.icon" src="@/assets/images/FolderOutlined.svg" />
      <span :class="$style.label">新建</span>
      <img :class="$style['add-icon']" src="@/assets/images/PlusOutlined.svg" />
    </div>
    <div :class="$style['upload-btn']" @click="uploadModal = true">
      <img :class="$style.icon" src="@/assets/images/FileDocumentFilled.svg" />
      <span :class="$style.label">上传</span>
      <img :class="$style['add-icon']" src="@/assets/images/PlusOutlined.svg" />
    </div> -->
    <!-- <UserKBUploadModal v-model:visible="uploadModal" /> -->
  </div>
</template>
<script lang="ts" setup>
import UserKBUploadModal from './UserKBUploadModal.vue'
import { useFileStore } from '../../store/useFileStore'
import { useMyLibrary } from '../../store/useMyLibrary'

const libraryStore = useMyLibrary()
const { myLibraryData } = storeToRefs(libraryStore)
const fileStore = useFileStore()
const { dataList } = storeToRefs(fileStore)
const uploadModal = ref(false)
const route = useRoute()
const folderId = route.params.id

const addFolder = async () => {
  const parentId = folderId ? +folderId : undefined
  const res = await fileStore.addFolder('新建文件夹', parentId)
  if (res) dataList.value?.unshift(res)
  libraryStore.getMyLibraryData()
}
</script>
<style lang="less" module>
.user-kb-tools {
  display: flex;
  align-items: center;
}
.new-folder,
.upload-btn {
  margin-right: 12px;
  padding: 20px;
  width: 180px;
  height: 60px;
  background: #ffffff;
  border-radius: 2px;
  border: 1px solid #e1e4eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;

  &:hover {
    border-color: var(--primary-color);
  }

  .label {
    flex: 1;
    margin: 8px;
    font-size: 14px;
    font-weight: 400;
    color: #000000;
    line-height: 20px;
  }

  .icon {
    width: 20px;
    height: 20px;
  }

  .add-icon {
    width: 16px;
    height: 16px;
  }
}
</style>
