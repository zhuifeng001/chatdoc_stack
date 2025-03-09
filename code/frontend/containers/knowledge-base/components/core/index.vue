<template>
  <Layout :class="$style['kb-page']" :no-header="noHeader">
    <div
      v-if="userFileData.length"
      :class="[$style['kb-left'], showSidebar ? $style['sidebar-visible'] : $style['sidebar-hidden']]"
    >
      <Sidebar />
    </div>
    <template v-if="previewFile?.id">
      <div :class="[$style['kb-center']]">
        <KBDocument
          ref="KBDocumentRef"
          :file-id="previewFile?.id"
          :page-list="pageList"
          :imageList="thumbnailList"
          :tableContent="documentTableContent"
          :documentLoading="documentLoading"
          :catalogLoading="catalogLoading"
          :thumbnailLoading="thumbnailLoading"
          :highlightThumbnailPages="highlightThumbnailPages"
          @init="onPageMarkInit"
          @init-full="onPageMarkInitFull"
          @download="downloadDocument"
        />
      </div>
      <div :class="[$style['kb-right']]">
        <ResizeChunk placement="left" modifiers=".parent.flex" />
        <ChatWindow />
      </div>
    </template>
    <template v-else>
      <!-- <KbUploader></KbUploader> -->
    </template>
    <ClientOnly>
      <Welcome />
    </ClientOnly>
    <a-spin
      class="fixed top-0 left-0 z-[2000] w-screen h-screen flex-1 flex items-center justify-center flex-col gap-3 pointer-events-none"
      :spinning="userFileLoading"
      :tip="userFileLoading ? '文档加载中...' : ''"
    ></a-spin>
  </Layout>
</template>
<script lang="ts" setup>
import { useRouter } from 'vue-router'
import Layout from '@/containers/knowledge-base/components/layout/Layout.vue'
import ResizeChunk from '@/components/ResizeChunk/index.vue'
import ChatWindow from '@/containers/knowledge-base/components/chat/index.vue'
import KBDocument from '@/components/common/mark/Document.vue'
import KbUploader from '@/containers/knowledge-base/components/KbUploader.vue'
import Sidebar from '@/containers/knowledge-base/components/sidebar/index.vue'
import Welcome from '@/containers/knowledge-base/components/tour/Welcome.vue'
import { onMounted, provide, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useKBStore } from '@/containers/knowledge-base/store'
import { useLayout } from '@/containers/knowledge-base/store/useLayout'
import { useUser } from '@/containers/knowledge-base/store/useUser'
import { useTour } from '@/containers/knowledge-base/store/useTour'
import { message } from 'ant-design-vue'
// import { useCreativeStore } from '~/containers/creative/store/useCreative'
import { omit } from 'lodash-es'

const props = defineProps({
  noHeader: {
    type: Boolean,
    default: false
  }
})
const { noHeader } = toRefs(props)
const store = useKBStore()
const layoutStore = useLayout()
const { showSidebar } = storeToRefs(layoutStore)
const userStore = useUser()
const { isLogin, userToken } = storeToRefs(userStore)
const tourStore = useTour()
const route = useRoute()
const router = useRouter()
const {
  KBDocumentRef,
  libraryList,
  previewFile,
  fileFlatData,
  isMultiDocumentsMode,
  historyStateData,
  pageList,
  thumbnailList,
  highlightThumbnailPages,
  documentTableContent,
  documentLoading,
  catalogLoading,
  thumbnailLoading,
  userFileLoading,
  userFileData
} = storeToRefs(store)

provide('noHeader', noHeader)
provide('getPageMarkRef', store.getPageMarkRef)

const documentInfo = computed(() => {
  return previewFile.value //  isMultiDocumentsMode.value ? null : fileFlatData.value[0]
})

provide('documentInfo', documentInfo)

watch(
  isMultiDocumentsMode,
  () => {
    layoutStore.onChangeShowSidebar(isMultiDocumentsMode.value)
  },
  { immediate: true }
)

// 服务端请求
useAsyncData('libraryList', async () => {
  return store.getLibraryList()
})

const onPageMarkInit = ins => {
  store.eventEmitter.emit('page-mark-init', ins)
}
const onPageMarkInitFull = ins => {
  store.eventEmitter.emit('page-mark-init-full', ins)
}

const downloadDocument = () => {
  console.log('download 2')
}

// const { quoteContent, quoteImage } = useCreativeStore()
// const onCreateArticle = async data => {
//   const { text, html, base64 } = data
//   // TODO 目前仅有图片
//   if (base64) {
//     quoteImage(base64)
//   } else {
//     quoteContent(html || text)
//   }
// }

const setTokenByUrl = () => {
  const { token } = route.query || {}
  if (token) {
    storage.setItem('KB_TOKEN', String(token))
    userToken.value = String(token)
    router.replace({
      path: route.path,
      query: omit(route.query, ['token', 'data']),
      state: {
        data: route.query?.data
      }
    })
  }
  return !!token
}

onMounted(() => {
  setTokenByUrl()
  store.init()
  if (!historyStateData.value?.folderIds?.length && !historyStateData.value?.ids?.length) {
    message.warning('请先选择文档')
    router.push('/')
    return
  }
  if (isLogin.value) {
    if (!libraryList.value?.length) {
      store.getLibraryList()
    }
    setTimeout(() => {
      store.getChatFromChatId()
      tourStore.init()
    }, 300)
  } else {
    message.warning('登录失效或未登录，请重新登录')
    userStore.clearUser()
    router.push('/')
    return
  }
})

onBeforeMount(() => {
  store.initPage()
})
</script>
<style lang="less" module>
.kb-page {
  height: 100vh;
  display: flex;
  flex-direction: column;

  & * {
    box-sizing: border-box;
  }

  :global {
    .ant-layout-content {
      height: calc(100vh - 64px);
      display: flex;
      justify-content: space-between;
      background-color: #fff;
      color: #333;
    }
  }
}

.kb-left,
.kb-center,
.kb-right {
  height: 100%;
  flex: 1;
}
.kb-left {
  flex-shrink: 0;
  flex-grow: 0;
  flex-basis: 20%;
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  transition: flex-basis 0.1s, width 0.1s, opacity 0.3s;

  &.sidebar-visible {
    flex-basis: 260px;
    width: 260px;
    opacity: 1;
    visibility: visible;
  }

  &.sidebar-hidden {
    flex-basis: 0;
    width: 0;
    opacity: 0;
    visibility: hidden;
  }
}

.kb-center {
  position: relative;
  overflow: auto;
  min-width: 450px;
  flex-basis: 50%;
  padding: 0;
}

.kb-right {
  position: relative;
  min-width: 465px;
  flex-basis: 35%;
  background-color: burlywood;
}
</style>
<style lang="less">
@import url(@/containers/knowledge-base/components/tour/styles/tour-global.less);
</style>
<style>
@import url(@/assets/static/katex/katex.min.css);
</style>
