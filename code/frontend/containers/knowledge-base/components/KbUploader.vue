<template>
  <div :class="[$style['kb-uploader'], 'kb-uploader']">
    <Uploader
      :class="[$style['upload-document-wrapper'], 'kb-uploader-document-wrapper']"
      :accept="imageExtArray.concat(['.pdf', '.doc', '.docx', '.wps', '.xls', '.xlsx', '.txt'])"
      allow-cover
      :showUploadList="false"
      @change="onFileChangeSync"
    >
      <div :class="$style['upload-document-dummy']">
        <NuxtImg src="/assets/images/UploadDocument.png" alt="" format="webp" sizes="120px 120px" />
        <div :class="$style['upload-label']">
          拖拽或 <span style="color: var(--primary-color)">点击这里</span> 上传文件
        </div>
        <div :class="$style['upload-desc']">支持jpg,jpeg,png,bmp,pdf,图像单文档大小不超过100M</div>
      </div>
    </Uploader>
    <Uploader
      :class="[$style['upload-directory-wrapper'], 'kb-uploader-directory-wrapper']"
      :accept="imageExtArray.concat(['.pdf', '.doc', '.docx', '.wps', '.xls', '.xlsx', '.txt'])"
      allow-cover
      :showUploadList="false"
      directory
      @change="onFileChangeSync"
    >
      <div :class="$style['upload-directory-dummy']">
        <NuxtImg src="/assets/images/UploadDirectory.png" alt="" format="webp" sizes="120px 120px" />
        <div :class="$style['upload-label']">或 拖放文件夹作为集合</div>
        <div :class="$style['upload-desc']">与集合中的文档对话</div>
      </div>
    </Uploader>
  </div>
</template>
<script lang="ts" setup>
import Uploader from '@/components/common/Uploader/index.vue'
import { imageExtArray } from '@/utils/file'
import { useKBStore } from '../store'
import { storeToRefs } from 'pinia'
import { message } from 'ant-design-vue'
import { debounce } from 'lodash-es'

const store = useKBStore()
const { userFileData, selectedItem } = storeToRefs(store)

let currentFileList: any[] = []
const onFileChangeSync = file => {
  currentFileList.push(file)
  debounceHandler()
}
const debounceHandler = debounce(
  async () => {
    if (!currentFileList.length) return
    // 上传文件夹
    let existFolder
    const firstFile = currentFileList[0]
    if (firstFile.originFileObj.webkitRelativePath.includes('/')) {
      const folderName = firstFile.originFileObj.webkitRelativePath.split('/')[0]
      console.log('Folder Name: ' + folderName)
      // 判断文件夹是否存在
      existFolder = userFileData.value.find(o => o.type === 'folder' && o.title === folderName)
      if (existFolder) {
        message.info(`《${existFolder.title}》文件夹已存在`)
      } else {
        existFolder = await store.addFolder(folderName)
      }

      for (let i = 0; i < currentFileList.length; i++) {
        await onFileChange(currentFileList[i], existFolder)
      }
    }
    // 上传文件
    else {
      const selectedFolder = selectedItem.value?.type === 'folder' ? selectedItem.value : undefined
      console.log('selectedFolder :>> ', selectedFolder)
      for (let i = 0; i < currentFileList.length; i++) {
        await onFileChange(currentFileList[i], selectedFolder)
      }
    }

    setTimeout(() => {
      currentFileList.length = 0
    }, 200)
  },
  100,
  { leading: false, trailing: true }
)
const onFileChange = async (file, folderItem) => {
  console.log('onFileChange :>> ', file)

  await store.addFile(file, folderItem?.id)
}
</script>
<style lang="less" module>
.kb-uploader {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  :global {
    .ant-upload-drag-hover {
      background: #e0ebff !important;
    }
  }

  .upload-document-wrapper,
  .upload-directory-wrapper {
    .upload-document-dummy,
    .upload-directory-dummy {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    }
  }

  .upload-label {
    margin: 20px 0 8px 0;
    font-size: 14px;
    font-weight: 500;
    color: #000000;
    line-height: 20px;
  }

  .upload-desc {
    font-size: 12px;
    font-weight: 400;
    color: #959ba6;
    line-height: 16px;
  }
}
</style>
