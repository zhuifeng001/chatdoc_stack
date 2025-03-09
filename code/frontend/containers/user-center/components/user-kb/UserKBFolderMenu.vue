<template>
  <div :class="[$style['menu-tools'], $style[position]]">
    <a-dropdown :getPopupContainer="getPopupContainer">
      <div :class="$style['tool-item']" @click.stop>
        <!-- <ellipsis-outlined :class="$style['item-icon']" /> -->
        <More :class="$style['item-icon']" />
      </div>
      <template #overlay>
        <a-menu :class="$style['menu-wrap']">
          <a-menu-item v-if="askVisible && isSucceedFile(source.status)" key="1" @click.stop="toAsk">
            <div :class="$style['d-flex']">
              <img src="./../../images/MessageOutlined.svg" />
              <span :class="$style['menu-text']">去提问</span>
            </div>
          </a-menu-item>
          <a-menu-item key="2" @click.stop="fileRenameEdit">
            <div :class="$style['d-flex']">
              <img src="./../../images/EditOutlined.svg" />
              <span :class="$style['menu-text']">重命名</span>
            </div>
          </a-menu-item>
          <a-menu-item key="3" @click.stop="fileMoveShow">
            <div :class="$style['d-flex']">
              <img src="./../../images/LogoutOutlined.svg" />
              <span :class="$style['menu-text']">移动</span>
            </div>
          </a-menu-item>
          <a-menu-item key="4" @click.stop="fileDelete">
            <div :class="$style['d-flex']">
              <img src="./../../images/DeleteOutlined.svg" />
              <span :class="$style['menu-text']">删除</span>
            </div>
          </a-menu-item>
          <a-menu-item v-if="isFailedFile(source.status)" key="5" @click.stop="onReParse">
            <div :class="[$style['d-flex'], $style['menu-item']]">
              <ReloadOutlined :class="$style['item-icon']" />
              <span :class="$style['menu-text']">重新解析</span>
            </div>
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>

    <UserKBFolderSelect v-model:folderSelectVisible="folderSelectVisible" :source="source" @fileMove="fileMove" />
  </div>
</template>
<script lang="ts" setup>
import { EllipsisOutlined } from '@ant-design/icons-vue'
import UserKBFolderSelect from './UserKBFolderSelect.vue'
import { useFileStore } from '../../store/useFileStore'
import { useMyLibrary } from '../../store/useMyLibrary'
import MessageOutlined from '~/containers/financial/images/MessageOutlined.vue'
import ReloadOutlined from '~/containers/knowledge-base/images/ReloadOutlined.vue'
import { FileStatusEnums, isFailedFile, isSucceedFile } from '~/containers/knowledge-base/store/helper'
import { reParseKBDocumentAPI } from '~/api'
import { Modal } from 'ant-design-vue'
import { More } from '@icon-park/vue-next'

const router = useRouter()
const libraryStore = useMyLibrary()
const fileStore = useFileStore()
const { dataList } = storeToRefs(fileStore)

const props = defineProps({
  source: {
    type: Object,
    required: true
  },
  position: {
    type: String as PropType<'relative' | 'absolute'>,
    default: 'absolute'
  },
  askVisible: {
    type: Boolean,
    default: false
  }
})
const emit = defineEmits(['fileRenameEdit'])

const folderSelectVisible = ref(false)

const getPopupContainer = node => node?.parentElement?.parentElement as HTMLElement

const confirmDelete = async () => {
  let res
  if (props.source._type === 'folder') {
    res = await fileStore.deleteFolder([props.source.id])
    libraryStore.getMyLibraryData()
  } else {
    res = await fileStore.deleteDocument([props.source.id])
    libraryStore.getMyLibraryData()
  }
  if (res?.data) {
    dataList.value.splice(
      dataList.value.findIndex(item => item._id === props.source._id),
      1
    )
  }
}

const fileDelete = async () => {
  const modalClass = 'deleteFileModalClass'
  if (!props.source.documentCount || props.source._type === 'file') {
    await confirmDelete()
    return
  }
  const onCancel = () => {
    // 关闭弹窗
    const node = document.querySelector(`.${modalClass}`)?.parentElement?.parentElement as HTMLElement
    if (node) {
      console.log('deleted', node?.parentElement?.removeChild(node))
    }
  }
  Modal.confirm({
    title: '删除文件夹',
    content: '删除文件夹后，文件夹内的文件也会被删除，确定删除吗？',
    wrapClassName: modalClass,
    onOk: async () => {
      await confirmDelete()
      onCancel()
    },
    onCancel
  })
}

const fileMoveShow = () => {
  folderSelectVisible.value = true
}

const fileMove = async id => {
  let res
  if (props.source._type === 'folder') {
    res = await fileStore.moveFolder([
      {
        id: props.source.id,
        targetId: id
      }
    ])
  } else {
    res = await fileStore.moveDocument([
      {
        documentId: props.source.id,
        folderId: id
      }
    ])
  }
  if (res?.data) {
    libraryStore.getMyLibraryData()
    dataList.value.splice(
      dataList.value.findIndex(item => item._id === props.source._id),
      1
    )
  }
}

const fileRenameEdit = () => {
  emit('fileRenameEdit')
}

const toAsk = () => {
  let data
  if (props.source._type === 'folder') {
    data = { folderIds: [props.source.id], personal: true }
  } else {
    data = { ids: [props.source.id], personal: true }
  }
  router.push({ name: 'knowledge-base', state: { data: JSON.stringify(data) } })
}

const onReParse = async () => {
  await reParseKBDocumentAPI({ id: props.source.id })
  fileStore.getFolderFile()
  props.source.status = FileStatusEnums.DOC_PARSED
}
</script>
<style lang="less" module>
.menu-tools {
  &.absolute {
    position: absolute;
    top: 8px;
    right: 8px;

    .tool-item {
      margin-bottom: 8px;
    }
  }

  &.relative {
    position: relative;

    .tool-item {
      margin-bottom: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
  }

  display: flex;
  flex-direction: column;

  .tool-item {
    width: 28px;
    height: 28px;
    background: #fff;
    border-radius: 4px;
    cursor: pointer;

    display: flex;
    align-items: center;
    justify-content: center;
    &:hover {
      color: var(--primary-color);
    }
  }
}

.menu-wrap {
  width: 112px;
}

.menu-item {
  .item-icon {
    width: 16px;
    height: 16px;
    color: #333;
  }

  &:hover {
    .item-icon {
      filter: brightness(0.8);
      color: #1890ff;
    }
  }
}
.d-flex {
  display: flex;
  align-items: center;
}

.menu-text {
  margin-left: 8px;
}
</style>
