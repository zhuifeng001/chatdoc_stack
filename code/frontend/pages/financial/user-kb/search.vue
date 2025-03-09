<template>
  <FileWrapper />
</template>
<script lang="ts" setup>
import { useRouter } from 'vue-router'
import FileWrapper from '~/containers/user-center/components/UserFolder/FileWrapper.vue'
import { useFileStore } from '~/containers/user-center/store/useFileStore'

const route = useRoute()
const keyword = computed(() => String(route.query?.keyword || ''))

const fileStore = useFileStore()
const { userFolders, folderIdByPage, lastFolderId, listSearchCondition } = storeToRefs(fileStore)
const init = async () => {
  if (isClient) {
    listSearchCondition.value.keyword ??= keyword.value
    if (!listSearchCondition.value.keyword) return
    await fileStore.getFolderFile(true)
  }
}
init()

onBeforeRouteLeave((to, from, next) => {
  next()
  if (to.path.includes('/financial/user-kb/')) {
    const folder = userFolders.value.find(o => String(o.id) === String(to.params.id))
    fileStore.focusFolder(folder, false)
  }
})
</script>
