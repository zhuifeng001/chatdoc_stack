<template>
  <a-modal
    v-model:open="visible"
    :closable="false"
    destroyOnClose
    title="移动到文件夹"
    @cancel="closeModal"
    @ok="folderMove"
  >
    <a-select
      :class="$style['w-100']"
      v-model:value="folderName"
      placeholder="选择文件夹"
      :open="selectOpen"
      @focus="openSelect"
    >
      <template #dropdownRender="{ menuNode: menu }">
        <a-input :class="$style['border-none']" style="outline: none" v-model:value="word" placeholder="搜索文件夹">
          <template #prefix>
            <search-outlined />
          </template>
        </a-input>
        <hr :class="$style['bg-primary']" />
        <div :class="[$style['tree-wrapper'], 'scroll-bar']">
          <DocumentTree :customLibraryChildren="searchList" :useCache="true" @selectItem="selectItem" />
        </div>
      </template>
    </a-select>
  </a-modal>
</template>
<script lang="ts" setup>
import DocumentTree from '../main/DocumentTree.vue'
import { useMyLibrary } from '../../store/useMyLibrary'
import { SearchOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useFileStore } from '../../store/useFileStore'
import { cloneDeep } from 'lodash-es'

const fileStore = useFileStore()
const { selectedFolder, userFolders } = storeToRefs(fileStore)

const props = defineProps({
  folderSelectVisible: {
    type: Boolean,
    required: true
  }
})
const emit = defineEmits(['fileMove', 'update:folderSelectVisible'])

const selectOpen = ref(false)
const visible = ref(props.folderSelectVisible)
const folderId = ref(undefined)
const folderName = ref(undefined)
const word = ref('')
// const treeData = computed(() => [{ id: -1, name: '我的知识库', children: myLibraryData.value?.children || [] }])
// 只保留一级目录
const treeData = computed(() => userFolders.value || [])
const searchList = computed(() => {
  const dfs = (list: any[] = []) => {
    return list.filter(item => {
      if (item.name.includes(word.value)) {
        return true
      }
      if (item.children?.length) {
        item.children = dfs(item.children)
        return item.children?.length
      }
    })
  }
  if (word.value) {
    return dfs(cloneDeep(treeData.value))
  }
  return treeData.value
})

const closeSelect = () => {
  selectOpen.value = false
}

const clearSelect = () => {
  folderId.value = undefined
  folderName.value = undefined
}

const closeModal = () => {
  visible.value = false
  closeSelect()
  clearSelect()
  emit('update:folderSelectVisible', false)
}

const folderMove = () => {
  emit('fileMove', folderId.value)
  setTimeout(() => {
    closeSelect()
    clearSelect()
  })
}

const openSelect = () => {
  selectOpen.value = true
}

const selectItem = async node => {
  closeSelect()
  if (node.id == selectedFolder.value?.id) {
    message.warn('不可以移动到自身文件夹下')
    return
  }
  folderId.value = node.dataRef.id
  folderName.value = node.dataRef.name
}

watchEffect(() => {
  visible.value = props.folderSelectVisible
})
</script>
<style lang="less" module>
.w-100 {
  width: 100%;
}
.border-none {
  border: none !important;
}
.bg-primary {
  border: 1px solid #5f74b2;
}
.tree-wrapper {
  max-height: 300px;
  padding-right: 4px;
}
</style>
<style lang="less" scoped>
.ant-input-affix-wrapper-focused {
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}
</style>
