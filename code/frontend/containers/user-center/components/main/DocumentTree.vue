<template>
  <a-space v-if="initMenu" v-for="item in new Array(3)" style="display: flex; margin-left: 24px">
    <a-skeleton-avatar active shape="circle" :size="16" style="margin-top: 4px" />
    <a-skeleton-input active style="width: 128px" size="small" />
  </a-space>
  <a-directory-tree
    v-else-if="reload"
    :class="[$style['document-tree'], 'slide-tree-menu']"
    v-model:selectedKeys="selectedKeys"
    autoExpandParent
    defaultExpandAll
    :tree-data="libraryList"
    :fieldNames="{ title: 'name', key: 'id', children: 'children' }"
    @select="onSelectItem"
  >
    <template #icon>
      <CloseCircleFilled />
    </template>
    <template #title="{ dataRef }">
      <span :class="$style['kb-label-title']">
        <EllipsisTooltip :title="dataRef.name" />
      </span>
      <span :class="$style['kb-label-count']">{{ dataRef.documentCount }}</span>
    </template>
  </a-directory-tree>
</template>
<script lang="ts" setup>
import { useMyLibrary } from '../../store/useMyLibrary'
import CloseCircleFilled from '../../images/CloseCircleFilled.vue'
import EllipsisTooltip from './EllipsisTooltip.vue'

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
const store = useMyLibrary()
const { myLibraryData, initMenu } = storeToRefs(store)

const selectedKeys = ref<number[]>([])

onMounted(() => {
  if (!props.useCache) store.getMyLibraryData()
})
const onSelectItem = (_, { node }) => {
  emit('selectItem', node)
}

const libraryList = computed(() => {
  return props.customLibraryChildren ? props.customLibraryChildren : myLibraryData.value?.children
})
watch(
  libraryList,
  () => {
    if (libraryList.value?.length) {
      initMenu.value = false
    }
  },
  { immediate: true }
)

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
</script>
<style lang="less" module>
.document-tree {
  padding-left: 12px;

  :global {
    .ant-tree-treenode {
      &::before {
        display: none;
      }

      &:hover,
      &.ant-tree-treenode-selected {
        color: var(--primary-color);

        .ant-tree-node-content-wrapper,
        .ant-tree-iconEle {
          color: var(--primary-color) !important;
        }
      }

      .ant-tree-switcher {
        display: none;
      }

      .ant-tree-iconEle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 34px;
        margin-right: 8px;
        color: #959ba6;
        transition: all 0.3s;
      }

      .ant-tree-node-content-wrapper {
        display: flex;
        line-height: 34px;
        padding-left: 10px;
        overflow: hidden;

        .ant-tree-title {
          flex: 1 1 auto;
          display: inline-flex;
          justify-content: space-between;
          overflow: hidden;
        }
      }
    }
  }

  .kb-label-title {
    padding-right: 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .kb-label-count {
    color: #757a85;
  }
}
</style>
