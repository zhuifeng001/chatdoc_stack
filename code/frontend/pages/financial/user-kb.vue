<script setup lang="ts">
import UserFileHeader from '~/containers/user-center/components/UserFolder/UserFileHeader.vue'
import FolderMenu from '~/containers/user-center/components/UserFolder/FolderMenu.vue'
import { useFileStore } from '~/containers/user-center/store/useFileStore'
import type { CSSProperties } from 'vue'

const route = useRoute()
const router = useRouter()
const fileStore = useFileStore()

const { isSearchState, lastFolderId, folderIdByPage, userFolders } = storeToRefs(fileStore)

const init = async () => {
  if (isClient) {
    await fileStore.initPage()

    if (route.path === '/financial/user-kb/search') {
      return
    }
    // 路由中是否有folderId，没有就默认第一个文件夹
    const folderId = lastFolderId.value || folderIdByPage.value || userFolders.value?.[0]?.id
    router.replace('/financial/user-kb/folder/' + folderId)
    fileStore.focusFolder(
      userFolders.value.find(o => String(o.id) === String(folderId)),
      false
    )
  }
}

init()

const headerStyle: CSSProperties = {
  color: '#000',
  height: '60px',
  padding: '0 0 0 0',
  lineHeight: '60px',
  backgroundColor: 'transparent'
}
const keepaliveConfig = { include: ['financial-user-kb-folder-id'] }
</script>

<template>
  <ClientOnly>
    <a-layout :class="$style['user-file-page']">
      <a-layout-content :class="$style['user-file-wrapper']">
        <a-layout-header :style="headerStyle">
          <UserFileHeader />
        </a-layout-header>
        <a-layout :class="$style['user-file-container']">
          <a-layout-sider
            :collapsedWidth="0"
            :collapsed="isSearchState"
            theme="light"
            width="260px"
            :class="[$style['user-folder-sidebar'], 'h-full border-r']"
          >
            <FolderMenu />
          </a-layout-sider>
          <a-layout-content class="scroll-bar">
            <NuxtPage :keepalive="keepaliveConfig" />
          </a-layout-content>
        </a-layout>
      </a-layout-content>
    </a-layout>
  </ClientOnly>
</template>
<style lang="less" module>
.user-file-page {
  padding: 60px 60px 10px;
  height: 100vh;
}

.user-file-wrapper {
  max-width: 1200px; // var(--max-width);
  margin: 0 auto;
  width: 100%;
}

.user-file-container {
  height: calc(100% - 60px - 10px);
  background: #ffffff;
  box-shadow: 0px 1px 4px 0px rgba(3, 10, 26, 0.1);
  border-radius: 8px;
}

.user-folder-sidebar {
  background: transparent !important;
}
</style>
