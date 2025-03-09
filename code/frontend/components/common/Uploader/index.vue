<template>
  <a-upload-dragger
    class="doc-uploader"
    :class="{ 'multiple-uploader': allowMultiple }"
    :showUploadList="false"
    :directory="directory"
    :multiple="allowMultiple"
    :fileList="fileList"
    @change="handleChange"
    :customRequest="() => {}"
    :accept="realAccept"
    @drop="onDrop"
    @reject="rejectByAccept"
  >
    <!-- :showUploadList="false" -->
    <slot :file-list="fileList"> </slot>
    <slot name="list">
      <div v-if="showUploadList" class="file-upload-list" @click.stop>
        <div v-for="file in fileList" :key="file.uid" class="file-upload-item">
          <i :class="['fileType-icon', getFileTypeByName(file.name)]"></i>
          <div class="file-status-info">
            <div class="file-operation-wrap">
              <span :style="file.status === 'error' ? 'color: red' : ''">{{ file.name }}</span>
              <div class="file-operation">
                <Loading3QuartersOutlined v-if="file.status === 'uploading'" spin />
                <Close theme="outline" @click.stop="deleteFile(file)" />
              </div>
            </div>
            <a-progress
              class="file-upload-progress"
              :percent="file.percent"
              size="small"
              :showInfo="false"
              :status="getFileStatus(file)"
            />
          </div>
        </div>
      </div>
    </slot>
  </a-upload-dragger>
</template>
<script lang="ts" setup>
import {
  isImage,
  isPDF,
  isWORD,
  isEXCEL,
  isTXT,
  isTiffByMineType,
  parseTiffToBase64,
  getFileTypeByName,
  getFileExtensionWithDot
} from '@/utils/file'
import { message } from 'ant-design-vue'
import FileExcelFilled from './images/FileExcelFilled.svg'
import FilePdfFilled from './images/FilePdfFilled.svg'
import FileWordFilled from './images/FileWordFilled.svg'
import FileTxtFilled from './images/FileTxtFilled.svg'
import type { Func } from '@/types'
import { type PromiseWithAbort, genPromiseWithAbort } from '@/utils/promise'
import { useIdlePromise } from '@/utils/util'
import { checkFileSize } from './helpers'
import { debounce, uniqueId } from 'lodash-es'
import { Close } from '@icon-park/vue-next'
import { Loading3QuartersOutlined } from '@ant-design/icons-vue'

type AcceptValue = string | (string | string[])[]

const getFileIconByName = (filename: string) => {
  if (isPDF(filename)) {
    return FilePdfFilled
  } else if (isWORD(filename)) {
    return FileWordFilled
  } else if (isTXT(filename)) {
    return FileTxtFilled
  } else if (isEXCEL(filename)) {
    return FileExcelFilled
  } else {
    return FileTxtFilled
  }
}

const props = defineProps({
  accept: {
    type: [String, Array] as PropType<AcceptValue>,
    default: () => []
  },
  customRequest: {
    type: Function
  },
  limit: {
    type: Number
  },
  allowCover: {
    type: Boolean,
    default: false
  },
  beforeUpload: {
    type: Function as PropType<Func<[any], Promise<boolean> | boolean>>
  },
  getUploadParams: {
    type: Function
  },
  customReject: {
    type: Function
  },
  enableBatch: {
    type: Boolean,
    default: false
  },
  enablePaste: {
    type: Boolean,
    default: false
  },
  directory: {
    type: Boolean,
    default: false
  },
  showUploadList: {
    type: Boolean,
    default: true
  },
  handleFileBeforeUpload: {
    type: Function
  }
})
const emit = defineEmits(['change', 'delete', 'reject', 'reset', 'drop'])
const { enablePaste, handleFileBeforeUpload, getUploadParams, beforeUpload } = props
const { enableBatch, accept, allowCover } = toRefs(props)
const vm = getCurrentInstance()?.proxy as any

const acceptArray = computed(() => (Array.isArray(accept.value) ? accept.value.flat(2) : [accept.value]))
const realAccept = ref<string>(String(accept.value))
const allowMultiple = ref(Array.isArray(accept.value))
const currentMineType = ref<string | string[]>()
const fileList = ref<any[]>([])
const ignoreReject = ref(false)

const getFileStatus = file => {
  const status = file.status
  switch (status) {
    case 'done':
      return 'success'
    case 'error':
      return 'exception'
    case 'uploading':
    default:
      return 'active'
  }
}

watchEffect(() => {
  if (fileList.value.length > 0) {
    const mineType = getFileExtensionWithDot(fileList.value[0].name)

    if (enableBatch.value) {
      currentMineType.value = acceptArray.value.slice()
    } else {
      currentMineType.value = Array.isArray(accept.value)
        ? accept.value.find(o => o.includes(mineType))
        : accept.value.includes(mineType)
        ? accept.value
        : undefined
    }
    allowMultiple.value = Array.isArray(currentMineType.value) // 数组类型表示多选
    realAccept.value = allowCover.value ? String(accept.value) : String(currentMineType.value)
  }
})

const imageSrcList = ref<string[]>([])
const imageConversionPromises = ref<PromiseWithAbort>()

// 处理图片预览
watch(
  () => fileList.value.map(o => o.uid).join(','),
  () => {
    if (!isImage(fileList.value[0]?.name)) return

    useIdlePromise(() => {
      // 存在转换中的promise，就取消，重新转换
      if (imageConversionPromises.value) {
        imageConversionPromises.value?.abort?.()
        imageConversionPromises.value = undefined
      }

      const setImageSrcList = async () => {
        for (let i = 0; i < fileList.value.length; i++) {
          const file = fileList.value[i]
          if (isTiffByMineType(file.type)) {
            imageSrcList.value.splice(i, 1, await parseTiffToBase64(file.originFileObj))
          } else {
            imageSrcList.value.splice(i, 1, URL.createObjectURL(file.originFileObj))
          }
        }
      }

      imageSrcList.value = []
      imageConversionPromises.value = genPromiseWithAbort(setImageSrcList())
    })
  }
)

let currentFileList: any[] = []
const handleChange = info => {
  currentFileList.push(info)
  debounceHandler()
}
const debounceHandler = debounce(
  async () => {
    const prevFileList = currentFileList.slice()

    for (let i = 0; i < prevFileList.length; i++) {
      await handleChangeSync(prevFileList[i], i)
    }

    setTimeout(() => {
      currentFileList.length = 0
    }, 300)
  },
  100,
  { leading: false, trailing: true }
)
const handleChangeSync = async function (info, index: number) {
  // 拖拽移动顺序，这里禁止
  if (!info?.file?.uid) return

  const fileExtension = getFileExtensionWithDot(info.file.name)
  const isSamePrev = currentMineType.value?.includes(fileExtension)
  const isInAccept = acceptArray.value.includes(fileExtension)

  // 仅第一个文件会覆盖，且如果是单个文件上传，就覆盖
  if (allowCover.value && index === 0 && !isSamePrev && isInAccept) {
    reset()
  }

  // 文件不符合当前accept类型的
  if (!enableBatch.value && currentMineType.value && !isSamePrev) {
    // FIXED 会导致已上传的文件清空
    // allowCover.value && reset();
    rejectByAccept([info.file], true)
    return
  }

  // 文件不符合accept类型的
  if (!isInAccept) {
    rejectByAccept([info.file], true)
    return
  }

  if (props.limit != null && !checkFileSize(info.file.originFileObj, props.limit)) return

  if ((await beforeUpload?.(info.file.originFileObj)) === false) return

  const file = reactive(handleFileBeforeUpload ? handleFileBeforeUpload(info.file) : info.file)

  file.percent = 0
  file.status = 'uploading'

  if (allowMultiple.value) {
    fileList.value.push(file)
  } else {
    fileList.value = [file]
  }

  emit('change', file)

  // const status = info.file.status;
  // if (status !== 'uploading') {
  // 	console.log(info.file, info.fileList);
  // }
  // if (status === 'done') {
  // 	message.success(`${info.file.name} file uploaded successfully.`);
  // } else if (status === 'error') {
  // 	message.error(`${info.file.name} file upload failed.`);
  // }
}

const rejectByAccept = debounce(
  (rejectFileList: any[] = [], internal = false) => {
    console.log('rejectFileList, internal', rejectFileList, internal, ignoreReject.value)
    if (ignoreReject.value) return

    if (!internal) {
      rejectFileList = rejectFileList.slice().map(o => ({ file: o }))
      currentFileList.push(...rejectFileList)
    }

    if (props.customReject) {
      props.customReject?.(
        currentFileList.map(o => o.file),
        accept.value,
        currentMineType.value
      )
    } else {
      message.error('您上传的文件类型不支持，请重新上传')
    }

    emit('reject', rejectFileList || [])

    setTimeout(() => {
      currentFileList.length = 0
    }, 300)
  },
  100,
  { leading: false, trailing: true }
)

const onDrop = (e: DragEvent) => {
  ignoreReject.value = false
  emit('drop', e)
  // 上传文件夹
  for (const item of e.dataTransfer?.items || []) {
    const entry = item.webkitGetAsEntry()
    if (!entry?.isDirectory) continue
    ignoreReject.value = true
    // @ts-ignore
    entry.createReader().readEntries(entries => {
      entries.forEach(entry => {
        entry.file(file => {
          // 处理成 ant file 结构
          handleChange({
            file: {
              uid: uniqueId(),
              size: file.size,
              lastModified: file.lastModified,
              lastModifiedDate: file.lastModifiedDate,
              name: file.name,
              type: file.type,
              originFileObj: file
            }
          })
        })
      })
    })
  }
}

const deleteFile = (file: any) => {
  const index = fileList.value.findIndex(item => item.uid === file.uid)
  fileList.value.splice(index, 1)
  !fileList.value.length && reset()
  emit('delete', file)
}

const reset = () => {
  currentFileList.length = 0
  fileList.value = []
  imageSrcList.value = []
  realAccept.value = String(accept.value)
  currentMineType.value = undefined
  allowMultiple.value = Array.isArray(accept.value)
  emit('reset')
}

const listenPasteEvent = event => {
  const items = event.clipboardData.items
  for (let i = 0; i < items.length; i++) {
    if (items[i].kind === 'file') {
      const file = items[i].getAsFile()
      // 处理成 ant file 结构
      handleChange({
        file: {
          uid: uniqueId(),
          size: file.size,
          lastModified: file.lastModified,
          lastModifiedDate: file.lastModifiedDate,
          name: file.name,
          type: file.type,
          originFileObj: file
        }
      })
    }
  }
}

onMounted(() => {
  enablePaste && document.addEventListener('paste', listenPasteEvent)
})

onBeforeUnmount(() => {
  enablePaste && document.removeEventListener('paste', listenPasteEvent)
})
</script>
<style lang="less" scoped>
.doc-uploader {
  display: block;
  height: 100%;

  :deep(.ant-upload) {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  :deep(&.ant-upload.ant-upload-drag) {
    .ant-upload {
      padding: 16px;
    }
  }
  :deep(.ant-upload-btn) {
    padding: 72px 0 88px 0;

    .ant-upload-drag-icon {
      img {
        width: 72px;
        height: 72px;
      }
    }

    .ant-upload-text {
      font-size: 15px;
      font-weight: 500;
      color: var(--primary-color);
      line-height: 20px;
    }
  }

  :deep(.ant-upload-drag-container) {
    padding: 0 20px;
  }

  .single-file-upload-wrapper {
    .single-file-select-label {
      margin-top: 20px;
      margin-bottom: 4px;
      font-size: 12px;
      font-weight: 400;
      color: #757a85;
      line-height: 16px;
    }

    .single-file-name {
      font-size: 14px;
      font-weight: 600;
      color: #000000;
      line-height: 20px;
    }
  }
}

.multiple-uploader {
  :deep(.ant-upload-btn) {
    padding: 12px 16px;

    .ant-upload-drag-container {
      padding: 0;
    }
  }

  .file-upload-wrapper {
    text-align: left;
  }
}

.desc-file {
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 400;
  color: #868a9c;
  line-height: 20px;
}
.desc-file-list {
  height: 240px;
  overflow-x: hidden;
  overflow-y: auto;
  //滚动条样式
  &::-webkit-scrollbar-track-piece {
    background-color: transparent;
  }
  &::-webkit-scrollbar {
    display: inline-block;
    width: 5px;
    height: 5px;
  }
  &::-webkit-scrollbar-track-piece {
    background-color: transparent; //滚动槽
    border-radius: 8px;
  }
  &::-webkit-scrollbar-thumb:vertical {
    height: 10px;
    background-color: #cacad4;
    border-radius: 8px;
  }
  &::-webkit-scrollbar-thumb:horizontal {
    width: 10px;
    background-color: #cacad4;
    border-radius: 8px;
  }
  //滚动条鼠标移上去的样式
  &::-webkit-scrollbar-thumb:vertical:hover,
  &::-webkit-scrollbar-thumb:horizontal:hover {
    background-color: #cacad4;
  }
  li {
    height: 36px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    &.sortable-chosen {
      background: #fff;
      box-shadow: 0 8px 16px 2px rgba(72, 119, 255, 0.12);
      border-radius: 4px;
    }
    span.file-info {
      display: flex;
      width: 85%;

      .file-name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 200px;
        flex: 1;
        display: inline-block;
        text-align: left;
      }
      i.drag-icon {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        margin-right: 10px;
        cursor: move;
        background: url(./images/ic_move.svg) no-repeat center/contain;
      }
    }
    span.magnify-delete {
      display: flex;
      width: 15%;
      justify-content: flex-end;
      .magnify {
        width: 20px;
        height: 20px;
        margin-right: 5px;
        cursor: pointer;
      }
      .delete {
        width: 20px;
        height: 20px;
        cursor: pointer;
      }
      .magnify,
      .delete {
        font-size: 18px;
        color: #7f838e;

        &:hover {
          color: var(--primary-color);
        }
      }
    }
  }
}

i.fileType-icon {
  display: inline-block;
  position: relative;
  top: 2px;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  background: url(./images/FileWordFilled.svg) no-repeat center/contain;
  background-size: 100%;
}

i.fileType-icon.image {
  background: url(./images/FileImageFilled.svg) no-repeat center/contain;
}
i.fileType-icon.pdf {
  background: url(./images/FilePdfFilled.svg) no-repeat center/contain;
}
i.fileType-icon.word {
  background: url(./images/FileWordFilled.svg) no-repeat center/contain;
}
i.fileType-icon.excel {
  background: url(./images/FileExcelFilled.svg) no-repeat center/contain;
}
i.fileType-icon.txt {
  background: url(./images/FileTxtFilled.svg) no-repeat center/contain;
}
.file-upload-list {
  overflow: auto;
}

.file-upload-item {
  margin: 6px 0;
  width: 100%;
  display: flex;

  .file-status-info {
    margin-left: 4px;
    flex: 1;
  }

  :deep(.ant-progress) {
    display: block;
    height: 2px;
    line-height: 2px !important;
    .ant-progress-outer,
    .ant-progress-inner {
      display: block;
    }
    .ant-progress-bg {
      height: 2px !important;
    }
  }
}

.file-operation-wrap {
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .file-operation {
    display: flex;
    align-items: center;

    :deep(svg) {
      color: #757a85;
      cursor: pointer;
    }

    :deep(span:last-child svg) {
      margin-left: 8px;
    }
  }
}
</style>
