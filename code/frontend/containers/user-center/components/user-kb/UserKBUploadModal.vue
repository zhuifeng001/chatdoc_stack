<template>
  <div>
    <a-modal
      :open="visible"
      @update:open="v => emit('update:visible', v)"
      destroyOnClose
      :mask-closable="false"
      :centered="true"
      :width="520"
      :wrapClassName="$style['uploader-modal']"
      :cancel-button-props="{ prefixCls: 'rounded-full ant-btn' }"
      :ok-button-props="{ prefixCls: '!ml-4 rounded-full ant-btn', type: 'primary' }"
      @ok="emit('update:visible', false)"
      title="上传文件"
      cancel-text="关闭"
    >
      <template #closeIcon>
        <FoldIcon class="w-[20px] h-[20px]" />
      </template>
      <div :class="[$style['kb-uploader']]">
        <div class="text-sm mb-3 text-gray-600">
          当前文件夹：<a-tag color="orange">{{ selectedFolder?.name }}</a-tag>
        </div>
        <div class="w-full flex items-center justify-between">
          <Uploader
            :class="[$style['upload-document-wrapper'], 'kb-uploader-document-wrapper']"
            :accept="imageExtArray.concat(['.pdf', '.html', ...docExtArray])"
            allow-cover
            :showUploadList="false"
            :enableBatch="true"
            :limit="500"
            @change="onFileChangeSync"
          >
            <div :class="$style['upload-document-dummy']">
              <NuxtImg src="/assets/images/UploadDocument.png" alt="" format="webp" sizes="120px 120px" />
              <div :class="$style['upload-label']">
                拖拽 <span class="primary-color font-semibold">文件/文件夹</span> 或
                <span class="primary-color font-semibold">点击这里</span> 上传文件
              </div>
              <div :class="$style['upload-desc']">
                <span>支持pdf，doc, docx, jpg，jpeg，png，单份文件大小不超过500M</span>
                <br />
                <span class="mt-1 block">单个文件夹文件数量不超过50份</span>
              </div>
            </div>
          </Uploader>
          <!-- <Uploader
          :class="[$style['upload-directory-wrapper'], 'kb-uploader-directory-wrapper']"
          :accept="imageExtArray.concat(['.pdf', '.doc', '.docx', '.wps', '.xls', '.xlsx', '.txt'])"
          allow-cover
          :showUploadList="false"
          directory
          :enableBatch="true"
          @change="onFileChangeSync"
          :limit="500"
        >
          <div :class="$style['upload-directory-dummy']">
            <NuxtImg src="/assets/images/UploadDirectory.png" alt="" format="webp" sizes="120px 120px" />
            <div :class="$style['upload-label']">
              <span style="color: var(--primary-color)">点击这里</span> 或 拖放文件夹
            </div>
            <div :class="$style['upload-desc']">单个文件夹包含文件数量不超过50份</div>
          </div>
        </Uploader> -->
        </div>
        <UserKBUploading v-model:visible="uploadShow" :uploadFileList="uploadFileList" @onFileChange="onFileChange" />
      </div>
    </a-modal>
  </div>
</template>
<script lang="ts" setup>
import Uploader from '@/components/common/Uploader/index.vue'
import UserKBUploading from './UserKBUploading.vue'
import { imageExtArray } from '@/utils/file'
import { storeToRefs } from 'pinia'
import { message } from 'ant-design-vue'
import { debounce } from 'lodash-es'
import { useFileStore } from '../../store/useFileStore'
import { useMyLibrary } from '../../store/useMyLibrary'
import { getFileType } from './../../helpers/user-folder-file'
import FoldIcon from '../../images/FoldIcon.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  limitCount: {
    type: Number,
    default: Infinity
  },
  limitCallback: {
    type: Function
  }
})
const emit = defineEmits(['update:visible'])

const promiseManager = createPromiseConCurrency(1)

const libraryStore = useMyLibrary()
const fileStore = useFileStore()
const uploadShow = ref(false)
const { userFolders, folderIdByPage, uploadFileList, selectedFolder } = storeToRefs(fileStore)

let currentFileList: any[] = []
const onFileChangeSync = file => {
  if (props.limitCount != null && currentFileList.length >= props.limitCount) {
    props.limitCallback?.()
    return
  }
  currentFileList.push(file)
  debounceHandler()
}
const debounceHandler = debounce(
  async () => {
    if (!currentFileList.length) return
    uploadShow.value = true // 打开上传列表
    // 收集文件夹
    const folderFileMap = new Map()
    for (const fileI of currentFileList) {
      const folderName = fileI.originFileObj.webkitRelativePath.split('/')[0]
      // 判断文件夹是否存在
      // const existFolder = userFolders.value.find(o => o.name === folderName)
      // if (existFolder) {
      //   message.info(`《${existFolder.name}》文件夹已存在`)
      // }
      folderFileMap.set(folderName, [])
    }
    // 并发上传
    uploadFileList.value = []
    currentFileList.forEach(file => {
      const folderName = file.originFileObj.webkitRelativePath.split('/')[0]
      const fileItem = reactive({
        file,
        name: file.name,
        status: 'active',
        percent: 0,
        loaded: 0,
        size: file.size,
        type: getFileType(file.name),
        errorMsg: ''
      })
      uploadFileList.value.push(fileItem)
      folderFileMap.get(folderName).push(fileItem)
    })

    const promises: Promise<any>[] = []
    for (const folderName of folderFileMap.keys()) {
      let existFolder = userFolders.value.find(o => String(o.id) === String(folderIdByPage.value))

      // 创建子目录
      // if (!folderIdByPage.value && folderName && !existFolder) {
      //   existFolder = (await fileStore.addFolder(folderName, folderIdByPage.value)) as any
      // }

      promises.push(
        ...folderFileMap.get(folderName).map(file => promiseManager.add(onFileChange, file.file, file, existFolder))
      )
    }

    await promiseManager.wait
    // await Promise.all(promises)

    setTimeout(() => {
      currentFileList.length = 0
    }, 200)
  },
  100,
  { leading: false, trailing: true }
)

const onFileChange = async (file, fileItem, folderItem?) => {
  const res = await fileStore
    .addFile(file, folderItem?.id || folderIdByPage.value, progressEvent => {
      Object.assign(fileItem, {
        loaded: progressEvent.loaded,
        percent: Math.round((progressEvent.loaded * 100) / progressEvent.total),
        size: progressEvent.total,
        status: 'active'
      })
    })
    .then(res => {
      Object.assign(fileItem, {
        status: 'success'
      })
      useIdlePromise(() => {
        libraryStore.getMyLibraryData()
        fileStore.getFolderFile()
      })
      return res
    })
    .catch(() => {
      Object.assign(fileItem, {
        status: 'exception'
      })
    })
  if (typeof res === 'string') {
    fileItem.errorMsg = res
    Object.assign(fileItem, {
      status: 'exception'
    })
  }
}

watch(
  () => props.visible,
  v => {
    if (v) {
      uploadShow.value = false
      currentFileList = []
      uploadFileList.value = []
    }
  }
)
</script>
<style lang="less" module>
.uploader-modal {
  :global {
    .ant-modal-body {
      padding: 0px 0px 30px;
    }

    .ant-modal-close {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
}
.kb-uploader {
  position: relative;
  flex: 1;
  overflow: hidden;

  :global {
    .ant-upload-drag-hover {
      background: #e0ebff !important;
    }

    .kb-uploader-document-wrapper.ant-upload {
      // margin-right: 12px;
      width: 472px;
      height: 240px;
    }
    .kb-uploader-directory-wrapper.ant-upload {
      width: 320px;
      height: 360px;
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
