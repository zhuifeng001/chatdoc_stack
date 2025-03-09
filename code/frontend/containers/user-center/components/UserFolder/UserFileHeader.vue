<script lang="ts" setup>
import UserKBUploadModal from '@/containers/user-center/components/user-kb/UserKBUploadModal.vue'
import { LoadingOutlined, CloudUploadOutlined } from '@ant-design/icons-vue'
import Search from '@/containers/knowledge-base/images/search.vue'
import { useFileStore } from '~/containers/user-center/store/useFileStore'
import { ArrowLeft, Back, FolderPlus } from '@icon-park/vue-next'
import { debounce } from 'lodash-es'

const fileStore = useFileStore()
const { listSearchCondition, dataList, userFolders, totalPercent, isSearchState } = storeToRefs(fileStore)

const uploadModal = ref(false)

const loading = ref(false)
const router = useRouter()

const onSearch = debounce(
  async (value?: string) => {
    if (!isSearchState.value) {
      router.push({ path: '/financial/user-kb/search', query: { keyword: value } })
      return
    }
    if (!listSearchCondition.value.keyword) return
    await fileStore.getFolderFile(value ? true : isSearchState.value)
  },
  500,
  { leading: false, trailing: true }
)

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

const addFolder = debounce(
  async () => {
    if ((userFolders.value?.length || 0) >= 20) {
      message.error('文件夹个数不能多于20个')
      return
    }
    await fileStore.addFolder()
    await fileStore.getUserFolder()
    fileStore.fileStoreEvent.emit('editFolderName', userFolders.value?.[0])
  },
  300,
  { leading: true, trailing: false }
)

const back = () => {
  listSearchCondition.value.keyword = ''
  router.go(-1)
}
</script>
<template>
  <div :class="$style['user-kb-label-wrapper']">
    <div :class="$style['user-kb-label']">
      <ArrowLeft v-show="isSearchState" class="text-lg mr-3 hover:text-primary-color cursor-pointer" @click="back" />
      <span>知识库</span>
    </div>
    <div :class="$style['user-kb-label-extra']">
      <a-button
        v-show="!isSearchState"
        type="default"
        class="inline-flex items-center mr-4 !rounded-full flex-shrink-0"
        @click="addFolder"
      >
        <template #icon>
          <FolderPlus size="16px" class="flex items-center justify-items-center" />
        </template>
        <span class="ml-2">新建文件夹</span>
      </a-button>
      <a-button
        v-show="!isSearchState"
        type="primary"
        :class="[
          totalPercent > 0 && totalPercent < 100 ? '!bg-gray-500' : '',
          'relative w-[112px] inline-flex items-center mr-4 !rounded-full flex-shrink-0'
        ]"
        @click="startUpload"
      >
        <div class="absolute left-4 top-1 z-10 h-100 flex">
          <cloud-upload-outlined class="flex items-center justify-items-center text-base leading-[12px]" />
          <span class="ml-2">上传文件</span>
        </div>
        <a-progress
          v-show="totalPercent > 0 && totalPercent < 100"
          stroke-linecap="butt"
          :percent="totalPercent"
          :strokeWidth="30"
          :showInfo="false"
          :success="{ strokeColor: '#1a66ff' }"
          class="absolute left-0 top-0 rounded-none pointer-events-none shrink-0"
        />
      </a-button>

      <UserKBUploadModal
        v-show="!isSearchState"
        v-model:visible="uploadModal"
        :limit-count="remainingCount"
        :limit-callback="limitCallback"
      />
      <a-input-search
        v-model:value="listSearchCondition.keyword"
        :placeholder="'搜索文件'"
        allow-clear
        @search="onSearch"
      >
        <template #prefix>
          <loading-outlined v-if="loading" />
          <Search v-else src="" alt="搜索" @click="onSearch" />
        </template>
      </a-input-search>
    </div>
  </div>
</template>
<style lang="less" module>
.user-kb-label-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.user-kb-label {
  font-weight: bold;
  color: #030a1a;
  font-size: 30px;
  line-height: 40px;
}

.user-kb-label-extra {
  display: flex;
  align-items: center;
}
</style>
