<template>
  <div
    :class="[
      $style['search-input'],
      'kb-search-input',
      'kb-sidebar-search',
      !sidebarSearchVisible ? $style['hidden'] : ''
    ]"
  >
    <a-input
      class="scroll-bar"
      placeholder="搜索文档"
      v-model:value="searchValue"
      :bordered="false"
      allowClear
      @keydown.enter="onEnter"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
    >
    </a-input>
    <Search :class="[$style.icon, 'kb-search-icon']" src="" alt="搜索" @click="onSearch" />
    <!-- <KBDocumentSearchTip :visible="searchTipVisible" @close="searchTipVisible = false" /> -->
  </div>
</template>
<script lang="ts" setup>
import { getCurrentInstance, onBeforeUnmount, ref } from 'vue'
import { useKBStore } from '../../store'
import { storeToRefs } from 'pinia'
import KBDocumentSearchTip from './KBDocumentSearchTip.vue'
import Search from '../../images/search.vue'
import { debounce } from 'lodash-es'

const store = useKBStore()
const { sidebarSearchVisible, fileTreeData, userFileData } = storeToRefs(store)
const searchValue = ref('')
const onSearch = debounce(
  () => {
    searchHandle(searchValue.value)
    searchTipVisible.value = false
  },
  500,
  { leading: false, trailing: true }
)
const vm = getCurrentInstance()?.proxy as any
const searchTipVisible = ref(false)
let clearDom: HTMLElement | null

const onClear = () => {
  store.resetSearchStatus()
}

const judge = (name: string, value: string) => {
  return name.includes(value) || name.toLowerCase().includes(value) || name.toUpperCase().includes(value)
}

const searchHandle = (val: string) => {
  const deepFind = (arr: any[] = []) => {
    const bucket: any[] = []
    for (const item of arr) {
      if (judge(item.name, val)) {
        bucket.push(item)
        continue
      }
      if (item.children?.length) {
        const children = deepFind(item.children)
        if (item.children.length) {
          bucket.push({ ...item, children })
        }
      }
    }
    return bucket
  }
  const res = deepFind(userFileData.value.slice())
  fileTreeData.value = res
  setTimeout(() => {
    store.updateCheckedDocuments(true)
  })
}

const onInput = e => {
  let v = e.target.value
  v = v?.replace(/\n/g, '')
  searchValue.value = v
  if (v && !clearDom) {
    clearDom = vm.$el.querySelector('.ant-input-clear-icon')
    clearDom?.removeEventListener('click', onClear)
    clearDom?.addEventListener('click', onClear)
  } else {
    clearDom = null
  }
  onSearch()
}

const onEnter = () => {
  onSearch()
  searchTipVisible.value = false
}

const onFocus = () => {
  searchTipVisible.value = true
}
const onBlur = () => {
  searchTipVisible.value = false
}

onBeforeUnmount(() => {
  clearDom?.removeEventListener('click', onClear)
  clearDom = null
})
</script>
<style lang="less" module>
.search-input {
  transition: height 0.3s;
  visibility: visible;
  opacity: 1;
  height: 57px;

  &.hidden {
    padding: 8px 0;
    height: 0;
    visibility: hidden;
    opacity: 0;
  }

  .icon {
  }
}
</style>
