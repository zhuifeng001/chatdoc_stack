<script setup lang="ts">
import type { UserFolder } from '~/containers/knowledge-base/types'
import FolderOperation from './FolderOperation.vue'
import { useFileStore } from '~/containers/user-center/store/useFileStore'

const fileStore = useFileStore()
const { selectedFolder, userFolders } = storeToRefs(fileStore)
const focusFolder = (folder: UserFolder) => {
  if (selectedFolder.value?.id === folder.id) return
  fileStore.focusFolder(folder)
}

const nameRef = ref()
const onEditFolderName = (folder: UserFolder) => {
  folder._edit = true
  setTimeout(() => {
    const domRef = Array.isArray(nameRef.value) ? nameRef.value[0] : nameRef.value
    domRef?.focus()
  })
}
fileStore.fileStoreEvent.on((event, payload: UserFolder) => {
  if (event === 'editFolderName') {
    onEditFolderName(payload)
  }
})
const rename = async (folder: UserFolder) => {
  const { data } = await fileStore.updateFolder(folder.id, folder.name)
  if (data.name) folder.name = data.name
  fileStore.getUserFolder()
  folder._edit = false
}
</script>
<template>
  <div :class="[$style['folder-list-wrapper']]">
    <div class="p-5 text-lg font-semibold border-b leading-5 bg-white rounded-tl-lg">
      <span> 文件夹 </span>
    </div>
    <div :class="[$style['folder-menu-list'], 'scroll-bar']">
      <div
        :class="[
          'flex cursor-pointer',
          $style['folder-menu-item'],
          selectedFolder?.id === folder.id ? $style['active'] : ''
        ]"
        v-for="(folder, i) in userFolders"
        :key="folder.id"
        @click="focusFolder(folder)"
      >
        <div :class="[$style.icon, 'w-[42px] h-[42px] shrink-0 mr-3']">
          <!-- <NuxtImg v-if="i === 0" format="webp" src="/assets/images/files/ic-folder-default.png"></NuxtImg> -->
          <NuxtImg
            v-show="selectedFolder?.id === folder.id"
            format="webp"
            src="/assets/images/files/ic-folder-open.png"
          ></NuxtImg>
          <NuxtImg
            v-show="selectedFolder?.id !== folder.id"
            format="webp"
            src="/assets/images/files/ic-folder-close.png"
          ></NuxtImg>
        </div>
        <div class="flex-auto">
          <div class="flex items-center justify-between">
            <a-input
              v-if="folder._edit"
              ref="nameRef"
              v-model:value="folder.name"
              placeholder="请输入文件夹名称"
              size="small"
              @click.stop
              @pressEnter.stop="e => (e.target as HTMLElement)?.blur()"
              @blur="rename(folder)"
            ></a-input>
            <span
              v-else
              :title="folder.name"
              :class="[
                $style.name,
                'text-sm leading-5 font-semibold inline-block text-ellipsis overflow-hidden text-nowrap w-[158px]'
              ]"
              @dblclick.stop="() => onEditFolderName(folder)"
            >
              {{ folder.name }}
            </span>
            <FolderOperation :folder="folder" @edit="onEditFolderName" />
          </div>
          <div :class="[$style.desc, 'text-xs leading-4 mt-[2px]']">{{ folder.documentCount || 0 }}个文件</div>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="less" module>
.folder-list-wrapper {
  width: 100%;
  height: 100%;
  background: rgba(242, 244, 247, 0.5);

  .folder-menu-list {
    height: calc(100% - 61px);
    padding: 12px 0;

    .folder-menu-item {
      padding: 8px 12px;
      width: 100%;
      height: 58px;
      transition: all 0.3s;

      &:hover {
        box-shadow: 0px 1px 4px 0px rgba(3, 10, 26, 0.1);
        background: #fff;
      }
      &.active {
        box-shadow: 0px 1px 4px 0px rgba(3, 10, 26, 0.1);
        background: #e0ebff;
      }
    }
  }
}
</style>
