<script setup lang="ts">
import { More } from '@icon-park/vue-next'
import type { UserFolder } from '~/containers/knowledge-base/types'
import { useFileStore } from '~/containers/user-center/store/useFileStore'
import { useMyLibrary } from '~/containers/user-center/store/useMyLibrary'

defineProps({
  folder: {
    type: Object as PropType<UserFolder>,
    required: true
  }
})
const emit = defineEmits(['edit'])
const fileStore = useFileStore()
const { userFolders, selectedFolder, folderIdByPage } = storeToRefs(fileStore)
const router = useRouter()

const dropdownVisible = ref(false)

const vm = getCurrentInstance()?.proxy as any
const editFolderName = (folder: UserFolder) => {
  dropdownVisible.value = false
  emit('edit', folder)
}

const toAsk = source => {
  if (!source.documentCount) {
    return
  }
  fileStore.toAsk({ folderIds: [source.id] })
}

const confirmDelete = async source => {
  await fileStore.deleteFolder([source.id])
  await fileStore.getUserFolder()
  if (String(folderIdByPage.value) === String(source.id)) {
    if (userFolders.value?.[0]) {
      fileStore.focusFolder(userFolders.value?.[0])
    }
  }
}
const deleteFolder = async source => {
  dropdownVisible.value = false

  const modalClass = 'deleteFileModalClass'
  if (!source.documentCount) {
    await confirmDelete(source)
    return
  }
  const onCancel = () => {
    // 关闭弹窗
    const node = document.querySelector(`.${modalClass}`)?.parentElement?.parentElement as HTMLElement
    if (node) {
      node?.parentElement?.removeChild(node)
    }
  }
  Modal.confirm({
    title: '删除文件夹',
    content: '删除文件夹后，文件夹内的文件也会被删除，确定删除吗？',
    wrapClassName: modalClass,
    onOk: async () => {
      await confirmDelete(source)
      onCancel()
    },
    onCancel
  })
}
const getPopupContainer = node => node.parentElement?.parentElement as HTMLElement
</script>
<template>
  <a-dropdown
    v-model:open="dropdownVisible"
    :getPopupContainer="getPopupContainer"
    placement="bottomLeft"
    :overlayClassName="$style['item-tools']"
  >
    <div :class="$style['extra-icon']" @click.stop>
      <More />
    </div>
    <template #overlay>
      <a-menu :class="$style['folder-menu']" @click.stop>
        <!-- <a-menu-item v-if="folder.documentCount">
          <div class="flex items-center justify-center" @click.stop="toAsk(folder)">
            <img src="../../../user-center/images/MessageOutlined.svg" />
            <a href="javascript:;">去提问</a>
          </div>
        </a-menu-item> -->
        <a-menu-item>
          <div class="flex items-center justify-start" @click.stop="editFolderName(folder)">
            <img src="../../../user-center/images/EditOutlined.svg" />
            <a href="javascript:;">重命名</a>
          </div>
        </a-menu-item>
        <a-menu-item v-if="userFolders.length > 1">
          <div class="flex items-center justify-start" @click.stop="deleteFolder(folder)">
            <img src="../../../user-center/images/DeleteOutlined.svg" />
            <a href="javascript:;">删除</a>
          </div>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<style lang="less" module>
.extra-icon {
  padding: 2px;
  flex-grow: 0;
  flex-shrink: 0;
  border-radius: 3px;
  // display: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  transition: all 0.3s;

  &:hover {
    background-color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
  }

  :global {
    svg {
      width: 20px;
      height: 20px;
    }
  }
}

.folder-menu {
  width: 100px;
  font-size: 13px;

  :global {
    img {
      margin-right: 4px;
      width: 16px;
      height: 16px;
    }
    a,
    a:hover {
      font-size: 13px !important;
      color: #333 !important;
    }
  }
}
</style>
