<template>
  <a-space v-if="initMenu" v-for="item in new Array(3)" style="display: flex; margin-left: 24px">
    <a-skeleton-avatar active shape="circle" :size="16" style="margin-top: 4px" />
    <a-skeleton-input active style="width: 128px" size="small" />
  </a-space>

  <div
    :class="$style['folder-list-wrapper']"
    v-else-if="reload"
    :style="{ 'min-height': dropdownVisible ? '100px' : 0, transition: '0.5s' }"
  >
    <div
      :class="[$style['folder-item'], selectedKeys.includes(dataRef.id) ? $style['active'] : '']"
      v-for="dataRef in libraryList"
      :key="dataRef.id"
      @click="onSelectItem(dataRef)"
    >
      <img src="@/assets/images/FolderOutlined.svg" alt="" />
      <div :class="$style['title-wrapper']">
        <span :class="$style['kb-label-title']">
          <a-input
            v-if="dataRef.nameEditing"
            :ref="`nameRef${dataRef.id}`"
            v-model:value="dataRef.name"
            placeholder="请输入文件夹名称"
            size="small"
            @click.stop
            @pressEnter.stop="e => (e.target as HTMLElement)?.blur()"
            @blur="folderRename(dataRef)"
          ></a-input>
          <EllipsisTooltip v-else :title="dataRef.name" />
        </span>
        <!-- <span :class="$style['kb-label-count']">{{ dataRef.documentCount }}</span> -->
        <a-dropdown
          :getPopupContainer="node => node.parentElement?.parentElement as HTMLElement"
          placement="bottomLeft"
          :overlayClassName="$style['item-tools']"
          @openChange="dropdownVisibleChange"
        >
          <div :class="$style['extra-icon']" @click.stop>
            <EllipsisOutlined />
          </div>
          <template #overlay>
            <a-menu :class="$style['folder-menu']" @click.stop>
              <a-menu-item v-if="dataRef.documentCount">
                <div :class="$style['d-flex']" @click.stop="toAsk(dataRef)">
                  <img src="./../../images/MessageOutlined.svg" />
                  <a href="javascript:;">去提问</a>
                </div>
              </a-menu-item>
              <a-menu-item>
                <div :class="$style['d-flex']" @click.stop="fileRenameEdit(dataRef)">
                  <img src="./../../images/EditOutlined.svg" />
                  <a href="javascript:;">重命名</a>
                </div>
              </a-menu-item>
              <a-menu-item>
                <div :class="$style['d-flex']" @click.stop="deleteFolder(dataRef)">
                  <img src="./../../images/DeleteOutlined.svg" />
                  <a href="javascript:;">删除</a>
                </div>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useMyLibrary } from '../../store/useMyLibrary'
import EllipsisTooltip from './EllipsisTooltip.vue'
import EllipsisOutlined from '../../images/EllipsisOutlined.vue'
import { useFileStore } from '../../store/useFileStore'
import { Modal } from 'ant-design-vue'

const emit = defineEmits(['selectItem'])

const props = defineProps({
  customLibraryChildren: {
    type: Array
  },
  useCache: {
    type: Boolean,
    default: false
  }
})

const route = useRoute()
const libraryStore = useMyLibrary()
const { myLibraryData, initMenu } = storeToRefs(libraryStore)
const fileStore = useFileStore()
const { dataList } = storeToRefs(fileStore)

const selectedKeys = ref<number[]>([])
const toolsVisible = ref(false)
const dropdownVisible = ref(false)

onMounted(() => {
  if (!props.useCache) libraryStore.getMyLibraryData()
})
const onSelectItem = node => {
  emit('selectItem', node)
}

const libraryList = computed(() => {
  return props.customLibraryChildren ? props.customLibraryChildren : myLibraryData.value?.children
})

const dropdownVisibleChange = visible => {
  console.log('visible :>> ', visible)
  dropdownVisible.value = visible
}

watch(
  () => route.path,
  toPath => {
    if (/\/user-center\/user-kb\/[0-9]*/.test(toPath) && route.params.id) {
      selectedKeys.value = [Number(route.params.id)]
    } else {
      selectedKeys.value = []
    }
  },
  { immediate: true }
)
const reload = ref(true)
watch([myLibraryData], () => {
  reload.value = false
  nextTick(() => {
    reload.value = true
    const selectedItem =
      typeof document === 'object' && document.querySelector('.slide-tree-menu .ant-tree-treenode-selected')
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'center' })
    }
  })
})

const router = useRouter()
const confirmDelete = async source => {
  let res = await fileStore.deleteFolder([source.id])
  libraryStore.getMyLibraryData()
  if (String(route.params.id) === String(source.id)) {
    router.push('/user-center/user-kb')
  }
}
const deleteFolder = async source => {
  toolsVisible.value = false
  const modalClass = 'deleteFileModalClass'
  if (!source.documentCount) {
    await confirmDelete(source)
    return
  }
  const onCancel = () => {
    // 关闭弹窗
    const node = document.querySelector(`.${modalClass}`)?.parentElement?.parentElement as HTMLElement
    if (node) {
      console.log('deleted', node?.parentElement?.removeChild(node))
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

watch(
  () => libraryList.value?.find(o => o.nameEditing),
  source => {
    if (source) {
      setTimeout(() => {
        vm.$refs[`nameRef${source.id}`]?.[0]?.focus()
      })
    }
  }
)

const vm = getCurrentInstance()?.proxy as any
const fileRenameEdit = source => {
  toolsVisible.value = false
  source.nameEditing = true
}

const folderRename = async source => {
  const { data } = await fileStore.updateFolder(source.id, source.name)
  if (data.name) source.name = data.name
  libraryStore.getMyLibraryData()
  source.nameEditing = false
}
const toAsk = source => {
  toolsVisible.value = false
  if (!source.documentCount) {
    return
  }
  fileStore.toAsk({ folderIds: [source.id] })
}
</script>
<style lang="less" module>
.document-tree {
  padding-left: 12px;
}

.kb-label-title {
  margin-right: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kb-label-count {
  color: #757a85;
}

.folder-item {
  display: flex;
  align-items: center;

  img {
    margin-right: 4px;
  }
  &.active,
  &:hover {
    color: var(--primary-color);
  }

  .title-wrapper {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;

    .extra-icon {
      flex-grow: 0;
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      border-radius: 3px;
      // display: none;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #555;

      &:hover {
        background-color: #e1e1e1;
      }

      :global {
        svg {
          width: 20px;
          height: 20px;
        }
      }
    }
  }

  &:hover {
    .kb-label-count {
      display: none;
    }
    .extra-icon {
      display: flex;
      color: #333;
    }
  }
}

.d-flex {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.folder-list-wrapper {
  padding-left: 16px;
  padding-right: 8px;
  color: #000;
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

.item-tools {
  // left: 222px !important;
}
</style>
