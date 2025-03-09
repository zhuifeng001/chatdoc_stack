<template>
  <Uploader
    :class="$style['upload-btn']"
    :accept="imageExtArray.concat(['.pdf', '.doc', '.docx', '.wps', '.xls', '.xlsx', '.txt'])"
    allow-cover
    :showUploadList="false"
    @change="onFileChange"
  >
    <a-button type="primary">
      <template #icon>
        <img src="../../images/UploadOutlined.svg" alt="" />
      </template>
      上传文件
    </a-button>
  </Uploader>
</template>
<script lang="ts" setup>
import Uploader from '@/components/common/Uploader/index.vue'
import { imageExtArray } from '@/utils/file'
import { storeToRefs } from 'pinia'
import { useKBStore } from '../../store'

const store = useKBStore()
const { selectedItem } = storeToRefs(store)

const onFileChange = async file => {
  await store.addFile(file, selectedItem.value?.folderId)
}
</script>
<style lang="less" module>
.upload-btn {
  border: 0 !important;
  background-color: transparent !important;
  padding: 0 !important;

  :global {
    .ant-upload {
      padding: 0 !important;
    }
  }
}
</style>
