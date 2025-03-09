<template>
  <div
    :class="[
      $style['sidebar'],
      selectedFile?.id ? $style['sidebar-select-file'] : '',
      showSidebar ? $style['visible'] : $style['hidden']
    ]"
  >
    <div id="TourStep1"></div>
    <div id="TourStep2"></div>

    <Teleport to="body">
      <a-tooltip
        v-if="isMultiDocumentsMode"
        placement="bottom"
        overlayClassName="acg-tooltip"
        :title="showSidebar ? '收起文档列表' : '展开文档列表'"
      >
        <Left
          :class="[$style['control-icon'], showSidebar ? '' : $style['shrink']]"
          @click="showSidebar = !showSidebar"
        />
      </a-tooltip>
    </Teleport>
    <KBDocumentSearchInput v-if="isMultiDocumentsMode" />
    <a-spin
      :spinning="userFileLoading || searchStatus === SearchStatusEnums.DOING"
      wrapperClassName="kb-document-list-container"
    >
      <ClientOnly>
        <KBDocumentList :class="$style['document-list']" :show-header="isMultiDocumentsMode" @active="store.onActive" />
      </ClientOnly>
    </a-spin>
  </div>
</template>
<script lang="ts" setup>
import { getCurrentInstance, ref, nextTick, watch } from 'vue'
import MenuFoldOutlined from '../../images/MenuFoldOutlined.vue'
import MenuUnfoldOutlined from '../../images/MenuUnfoldOutlined.vue'
import KBDocumentList from './KBDocumentList.vue'
import KBDocumentSearchInput from './KBDocumentSearchInput.vue'
import KBDocumentSearchResult from './KBDocumentSearchResult.vue'
import { Close, Plus, Left } from '@icon-park/vue-next'
import { useKBStore } from '../../store'
import { storeToRefs } from 'pinia'
import { SearchStatusEnums } from '../../store/useSearch'
import { useLayout } from '../../store/useLayout'
import { isSucceedFile } from '../../store/helper'
const router = useRouter()
const route = useRoute()

const vm = getCurrentInstance()?.proxy as any

const { showSidebar } = storeToRefs(useLayout())
const store = useKBStore()
const { selectedItem, selectedFile, userFileLoading, userFileData, searchStatus, hasSearched, isMultiDocumentsMode } =
  storeToRefs(store)

const backDesc = ref('返回文档选择')

onMounted(() => {
  const historyStateData = JSON.parse(history.state?.data || route?.query?.data || '{}')
  if (historyStateData?.from === 'record') {
    backDesc.value = '返回问答记录'
  } else {
    backDesc.value = '返回文档选择'
  }
})

// 细节优化，第一次显示footer的时候，会遮挡列表中的元素
watch(
  () => selectedFile.value?._id,
  async (_id: string) => {
    await nextTick()
    const fileNode = vm.$el.querySelector(`[data-item-id="${_id}"]`) as HTMLElement
    fileNode?.scrollIntoView({ block: 'center' })
  }
)

const templateFolderName = '新建文件夹'
const findExistFolder = (folderName: string) => {
  return userFileData.value.some(o => {
    if (o.type === 'folder') {
      return o.title === folderName
    }
    return false
  })
}

const addFolder = () => {
  if (!findExistFolder(templateFolderName)) {
    store.addFolder(templateFolderName)
  } else {
    let i = 1
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const newFolderName = templateFolderName + (i === 1 ? '' : `（${i}）`)
      if (!findExistFolder(newFolderName)) {
        store.addFolder(newFolderName)
        break
      }
      i++
      if (i === 10) break
    }
  }
}
</script>
<style lang="less" module>
.sidebar {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;

  &.visible {
    display: flex;
  }
  &.hidden {
    display: none;
  }

  :global {
    .ant-spin-nested-loading {
      // height: calc(100% - 98px);
      height: 100%;
      overflow: hidden;
    }
    .ant-spin-container {
      height: 100%;
    }
  }

  .sidebar-header {
    padding: 16px;
    height: 40px;

    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }

  .document-list {
    height: 100%;
  }

  .sidebar-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 20px;
    background: #fff;

    display: flex;
    justify-content: space-between;

    :global {
      .ant-btn {
        display: flex;
        align-items: center;
      }
      img,
      svg {
        margin-right: 4px;
        width: 16px;
        height: 16px;
      }
    }
  }
}

.sidebar-select-file {
  .document-list {
    height: 100%;
  }
}

.control-icon {
  width: 16px;
  height: 50px;
  color: #959ba6;
  cursor: pointer;
  position: fixed;
  left: 259px;
  top: 50%;
  z-index: 10000;
  border-radius: 0 5px 5px 0;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.01);

  color: #666;
  &:hover {
    color: var(--primary-color);
  }

  &.shrink {
    left: 0px;
    transform: rotateY(180deg);
    border-radius: 5px 0 0 5px;
  }
}
</style>
<style lang="less">
.kb-document-list-container {
  > div > .ant-spin {
    max-height: 100%;
  }
}
</style>
