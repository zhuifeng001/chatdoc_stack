<template>
  <div :class="$style['user-kb-wrapper']">
    <div :class="$style['user-kb-label-wrapper']">
      <div :class="$style['user-kb-label']">{{ currentFolder?.name || '我的知识库' }}</div>
      <div :class="$style['user-kb-label-extra']">
        <a-button type="primary" :class="$style['upload-btn']" @click="startUpload">
          <template #icon>
            <cloud-upload-outlined :class="$style.icon" />
          </template>
          <span :class="$style.label">上传文件</span>
        </a-button>

        <UserKBUploadModal
          v-model:visible="uploadModal"
          :limit-count="remainingCount"
          :limit-callback="limitCallback"
        />
        <a-input
          :class="$style['user-kb-search-input']"
          v-model:value="listSearchCondition.keyword"
          :placeholder="'查找内容'"
          allow-clear
          @input="onSearchInput"
          @pressEnter="onSearch"
          @change="onSearch"
        >
          <template #prefix>
            <loading-outlined v-if="loading" />
            <Search v-else :class="$style['search-icon']" src="" alt="搜索" @click="onSearch" />
          </template>
        </a-input>
      </div>
    </div>
    <!-- <UserKBTools /> -->
    <UserKBTabs style="margin-top: 8px" />
  </div>
</template>
<script lang="ts" setup>
import { useRoute } from 'vue-router'
import { LoadingOutlined, CloudUploadOutlined } from '@ant-design/icons-vue'
import Search from '@/containers/knowledge-base/images/search.vue'
import UserKBTools from './UserKBTools.vue'
import UserKBTabs from './UserKBTabs.vue'
import { useFileStore } from '../../store/useFileStore'
import { useMyLibrary } from '../../store/useMyLibrary'
import UserKBUploadModal from './UserKBUploadModal.vue'
import { message } from 'ant-design-vue'

const route = useRoute()
const libraryStore = useMyLibrary()
const { myLibraryData } = storeToRefs(libraryStore)
const fileStore = useFileStore()
const { listSearchCondition, pageChecked, openBatch, dataList } = storeToRefs(fileStore)

const uploadModal = ref(false)

const currentFolder = computed(() => {
  const folderId = route.params.id
  return myLibraryData.value?.children.find(item => item.id === +folderId)
})

const loading = ref(false)
const keyword = ref('')
const onSearchInput = () => {}
const onSearch = useDebounceFn(async () => {
  await fileStore.getFolderFile()
}, 500)

const LIMIT_COUNT = 50
const remainingCount = computed(() => LIMIT_COUNT - dataList.value.length)
const limitCallback = () => {
  message.error('每个文件夹中文件个数不能多于50个')
}

const startUpload = () => {
  if (dataList.value.length >= LIMIT_COUNT) {
    limitCallback()
    return
  }
  uploadModal.value = true
}

watch(
  () => route,
  () => {
    Object.assign(listSearchCondition.value, { id: +route.params?.id || undefined, keyword: undefined })
    fileStore.getFolderFile()
  },
  { immediate: true }
)

onMounted(() => {
  pageChecked.value = false
  // openBatch.value = false
})
</script>
<style lang="less" module>
.user-kb-wrapper {
  position: relative;
}
.user-kb-label-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.user-kb-label {
  font-size: 16px;
  font-weight: bold;
  color: #030a1a;
  line-height: 24px;
}

.user-kb-search-input {
  padding: 5px 7px 5px 26px;
  width: 200px;
  background: #ffffff;
  border-radius: 2px;

  :global {
    .ant-input-prefix {
      position: absolute;
      left: 7px;
      top: 8px;
      width: 16px;
      height: 16px;
      z-index: 1;
      color: #868d9b;

      display: flex;
      justify-content: center;
      align-items: center;
    }
  }

  .search-icon {
    color: #757a85;
  }
}

.user-kb-label-extra {
  display: flex;
  align-items: center;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  margin-right: 16px;
  height: 34px;

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
