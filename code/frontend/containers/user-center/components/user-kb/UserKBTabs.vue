<template>
  <a-tabs v-model:activeKey="activeKey" :animated="false" destroyInactiveTabPane @change="changeSort">
    <a-tab-pane key="" tab="列表"><UserKBFolderFile /></a-tab-pane>
    <!-- <a-tab-pane key="recentUpdate" tab="最近更新" force-render><UserKBFolderFile /></a-tab-pane>
    <a-tab-pane key="recentUsed" tab="最近使用"><UserKBFolderFile /></a-tab-pane> -->
    <template #rightExtra>
      <UserKBTabsExtra2 />
    </template>
  </a-tabs>
</template>

<script lang="ts" setup>
import UserKBFolderFile from './UserKBFolderFile.vue'
import UserKBTabsExtra2 from './UserKBTabsExtra2.vue'
import { useFileStore } from '../../store/useFileStore'

const fileStore = useFileStore()
const { listSearchCondition } = storeToRefs(fileStore)
const activeKey = ref('')

const changeSort = () => {
  Object.assign(listSearchCondition.value, { sort: activeKey.value || undefined })
  fileStore.getFolderFile()
}
onMounted(() => {
  if (listSearchCondition.value.sort) {
    activeKey.value = listSearchCondition.value.sort
  }
})
</script>
