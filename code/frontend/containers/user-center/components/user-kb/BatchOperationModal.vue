<template>
  <div :class="[$style['batch-modal'], checkedDocumentByPage?.length ? $style['visible'] : '']">
    <div :class="$style['selected-wrapper']">
      <CheckCircleOutlined :class="$style['checked-symbol']" />
      <span>
        已{{ isAllCheckedByPage ? '全选' : '选择' }}
        <span class="primary-color">{{ checkedDocumentByPage.length }}</span>
        个文件
      </span>
    </div>
    <a-button type="link" :class="$style.cancel" @click="fileStore.onCancelSelected">取消选择</a-button>
    <a-button type="primary" danger :class="$style.delete" @click="openDeleteModal">批量删除</a-button>
    <a-button type="primary" :class="[$style.delete, 'ml-4']" @click="openMoveModal">批量移动</a-button>
    <a-button :class="[$style.ask, 'ml-4']" @click="toAsk">去提问</a-button>
  </div>
</template>
<script lang="ts" setup>
import { computed, ref, toRefs, watch } from 'vue'
import CheckCircleOutlined from '~/containers/financial/images/CheckCircleOutlined.vue'
import { useFileStore } from '../../store/useFileStore'
import { Modal, message } from 'ant-design-vue'
import { useMyLibrary } from '../../store/useMyLibrary'

const emit = defineEmits(['cancel', 'check-all', 'success'])
const libraryStore = useMyLibrary()
const fileStore = useFileStore()
const { dataList, selectedRowKeys, checkedDocumentByPage, isAllCheckedByPage, folderSelectVisible } =
  storeToRefs(fileStore)
const router = useRouter()

const toAsk = () => {
  const data = { personal: true, ...fileStore.getFoldersAndFiles() }
  router.push({ name: 'knowledge-base', state: { data: JSON.stringify(data) } })
}

const deleteDesc = ref('')
const onConfirmDelete = async () => {
  const { folderIds, ids } = fileStore.getFoldersAndFiles()
  const promises: any = []
  if (folderIds?.length) {
    promises.push(fileStore.deleteFolder(folderIds))
  }
  if (ids?.length) {
    promises.push(fileStore.deleteDocument(ids))
  }
  return Promise.all(promises)
    .then(() => {
      // message.success('删除成功')
    })
    .catch(() => {
      // message.error('删除失败')
    })
    .finally(() => {
      fileStore.getFolderFile()
      libraryStore.getMyLibraryData()
    })
}
const openDeleteModal = () => {
  deleteDesc.value = ''
  const { folderIds, ids } = fileStore.getFoldersAndFiles()

  if (folderIds?.length && ids?.length) {
    deleteDesc.value = '确定删除选中的文件夹、文档吗？'
  } else if (folderIds?.length) {
    deleteDesc.value = '确定删除选中的文件夹吗？'
  } else if (ids?.length) {
    deleteDesc.value = '确定删除选中的文件吗？'
  }

  Modal.confirm({
    title: '提示',
    content: deleteDesc.value || '确定删除吗？',
    okText: '确定',
    cancelText: '取消',
    onOk: () => {
      onConfirmDelete()
    }
  })
}

const openMoveModal = () => {
  folderSelectVisible.value = true
}
</script>
<style lang="less" module>
.batch-modal {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translate(-50%, 100%);
  z-index: 11;

  padding: 14px 20px;
  // color: #fff;
  // background: var(--primary-color);
  // box-shadow: 0px 6px 18px 0px rgba(3, 10, 26, 0.12);
  // border-radius: 4px;

  visibility: hidden;
  opacity: 0;
  transition: all 0.3s;

  display: flex;
  align-items: center;

  // width: 420px;
  height: 80px;
  color: #333;
  background: #ffffff;
  box-shadow: 0px 6px 18px 0px rgba(3, 10, 26, 0.12);
  border-radius: 12px;

  .cancel {
    color: #999;
    background: transparent !important;

    &:hover {
      color: #000;
    }
  }

  .delete {
    padding: 0 10px;
    border-color: transparent !important;
    &:hover {
      color: #fff;
      opacity: 1;
    }
  }

  .ask {
    border-color: var(--primary-color);
    padding: 0 10px;
    border-radius: 3px;
  }

  &.visible {
    visibility: visible;
    opacity: 1;
    bottom: 82px;
    transform: translate(-50%, 0);
  }

  .selected-wrapper {
    margin-right: 106px;
    display: flex;
    align-items: center;
  }

  .checked-symbol {
    margin-right: 6px;
    width: 20px;
    height: 20px;
    color: var(--primary-color);
  }
}
</style>
