<template>
  <a-spin :spinning="loading" :wrapperClassName="$style['list-loading']">
    <div :class="$style['user-kb-folder-file']">
      <FolderLayout v-for="source in dataList" :key="source._id" :row="row">
        <UserKBFolder v-if="source._type === 'folder'" :source="source" />
        <UserKBFile v-if="source._type === 'file'" :source="source" />
      </FolderLayout>
      <FileEmpty v-if="!dataList.length" :empty-text="isSearchState ? '未搜索到相关文件' : '暂无文件，请先上传'" />

      <!-- <Teleport to="#pagination">
      <UserKBPagination :pagination="listPagination" />
    </Teleport> -->
    </div>
  </a-spin>
</template>
<script lang="ts" setup>
import { useFileStore } from '../../store/useFileStore'
import UserKBFolder from './UserKBFolder.vue'
import UserKBFile from './UserKBFile.vue'
import UserKBPagination from './UserKBPagination.vue'
import FolderLayout from '../overview/FolderLayout.vue'
import FileEmpty from '~/containers/user-center/components/UserFolder/FileEmpty.vue'

const fileStore = useFileStore()
const { loading, dataList, isSearchState } = storeToRefs(fileStore)
const vm = getCurrentInstance()?.proxy as any

const size = ref()

onMounted(() => {
  size.value = useElementSize(vm.$el)
})
const row = computed(() => {
  if (!size.value) return 4
  if (size.value.width < 550) {
    return 2
  } else if (size.value.width < 750) {
    return 3
  } else if (size.value.width < 950) {
    return 4
  } else if (size.value.width < 1150) {
    return 5
  }
  return 6
})

onBeforeMount(() => {
  size.value = undefined
})
</script>
<style lang="less" module>
.user-kb-folder-file {
  width: 100%;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding: 0 1px;
}

.list-loading {
  min-height: 300px;
}
</style>
