<template>
  <div class="toolbar-search" :class="{ 'toolbar-search-modal': searchVisible }">
    <acg-tooltip overlayClassName="acg-tooltip" title="点击搜索" placement="bottom">
      <Search
        v-show="!searchVisible"
        class="cursor-pointer p-[3px] w-6 h-6 hover:bg-white rounded-sm transition-all text-gray-600 hover:text-primary-color"
        @click="openSearch"
      />
    </acg-tooltip>
    <a-input
      ref="inputRef"
      v-show="searchVisible"
      class="toolbar-search-input"
      v-model:value="keyword"
      :placeholder="searchVisible ? '请输入查找内容' : '点击搜索'"
      allow-clear
      @change="onSearchInput"
      @pressEnter="onSearchNext"
    >
      <template #prefix>
        <loading-outlined v-if="loading" />
        <Search v-else class="toolbar-search-icon" src="" alt="搜索" @click="onSearch" />
      </template>
    </a-input>
    <div class="toolbar-search-operation">
      <div v-show="flatSearchResults?.length" class="search-results-sum">
        {{ flatSearchResults.length ? searchIndex + 1 : searchIndex }} / {{ flatSearchResults.length }}
      </div>
      <a-divider v-show="flatSearchResults?.length" type="vertical" style="height: 20px; background-color: #e1e4eb" />
      <div v-show="flatSearchResults?.length" class="search-icon search-up-icon" @click="onSearchPrev">
        <DefUpOutlined />
      </div>
      <div v-show="flatSearchResults?.length" class="search-icon search-down-icon" @click="onSearchNext">
        <DefDownOutlined />
      </div>
      <div class="search-icon search-close-icon" @click.stop="closeSearch">
        <CloseOutlined />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useInject } from '@/hooks/useInject'
import { message } from 'ant-design-vue'
import { getCurrentInstance, onBeforeUnmount, ref, watch } from 'vue'
import { useSearch } from './useSearch'
import CloseOutlined from './images/CloseOutlined.vue'
import DefUpOutlined from './images/DefUpOutlined.vue'
import DefDownOutlined from './images/DefDownOutlined.vue'
import Search from './images/search.vue'
import { LoadingOutlined } from '@ant-design/icons-vue'
import { debounce, throttle } from 'lodash-es'

const { PageMarkRef, pageList, pageIndex, markSearchResults } = useInject([
  'PageMarkRef',
  'pageList',
  'pageIndex',
  'markSearchResults'
])

const vm = getCurrentInstance()?.proxy as any
let clearDom: HTMLElement | null

const searchVisible = ref(false)
const {
  loading,
  keyword,
  searchResults,
  flatSearchResults,
  searchDocKeyInfo,
  focusSearchMarkItem,
  preCreateSearchMark,
  clearSearchMarkItem
} = useSearch({
  PageMarkRef,
  pageList,
  pageIndex
})
let prevKeyword = ''
let searchIndex = ref(0)
const onSearch = debounce(
  () => {
    if (prevKeyword === keyword.value) {
      return
    }
    prevKeyword = keyword.value
    if (!keyword.value) return
    searchDocKeyInfo().then(() => {
      clearSearchMarkItem()
      searchIndex.value = 0

      if (!flatSearchResults.value.length) {
        message.warn('无结果')
        return
      }
      preCreateSearchMark(searchResults.value[searchIndex.value]?.index)
      flatSearchResults.value[searchIndex.value] && focusSearchMarkItem(flatSearchResults.value[searchIndex.value])
    })

    track({ name: `文档原文检索`, keyword: keyword.value, page: '问答页' })
  },
  300,
  { leading: false, trailing: true }
)

watch(flatSearchResults, () => {
  markSearchResults.value = searchResults.value.map(o => ({
    page: o.index,
    active: !!o._lines_by_search?.length
  }))
})

const onSearchInput = debounce(
  e => {
    const value = e.target.value?.trim()
    if (!value) {
      onClear()
      return
    }

    if (value && !clearDom) {
      clearDom = vm.$el.querySelector('.ant-input-clear-icon')
      clearDom?.removeEventListener('click', onClear)
      clearDom?.addEventListener('click', onClear)
    } else {
      clearDom = null
    }
    onSearch()
  },
  300,
  { leading: false, trailing: true }
)

const onSearchPrev = throttle(
  () => {
    if (!flatSearchResults.value.length) return
    if (searchIndex.value > 0) {
      focusSearchMarkItem(flatSearchResults.value[--searchIndex.value])
    } else {
      searchIndex.value = flatSearchResults.value.length - 1
      focusSearchMarkItem(flatSearchResults.value[searchIndex.value])
    }
  },
  200,
  { leading: false, trailing: true }
)
const onSearchNext = throttle(
  () => {
    if (!flatSearchResults.value.length) return
    if (searchIndex.value + 1 < flatSearchResults.value.length) {
      focusSearchMarkItem(flatSearchResults.value[++searchIndex.value])
    } else {
      searchIndex.value = 0
      focusSearchMarkItem(flatSearchResults.value[searchIndex.value])
    }
  },
  200,
  { leading: false, trailing: true }
)

const openSearch = () => {
  searchVisible.value = true
  setTimeout(() => {
    vm.$refs.inputRef?.focus()
  })
}
const closeSearch = () => {
  searchVisible.value = false
  onClear()
}

const onClear = () => {
  searchIndex.value = 0
  searchResults.value = []
  prevKeyword = ''
  keyword.value = ''
  clearSearchMarkItem()
}

watch(pageList, () => {
  searchVisible.value = false
  searchIndex.value = 0
  searchResults.value = []
  prevKeyword = ''
  keyword.value = ''
})

onBeforeUnmount(() => {
  clearDom?.removeEventListener('click', onClear)
  clearDom = null
})
</script>
<style lang="less" scoped>
.toolbar-search {
  // padding: 0 0 0 6px;
  // margin-left: 12px;
  transition: all 0.3s;
  display: flex;
  align-items: center;

  .toolbar-search-input {
    margin-right: 12px;
    padding: 2px 7px 2px 26px;
    min-width: 140px;
    max-width: 200px;
    width: 140px;
    background: #ffffff;
    border-radius: 2px;

    :deep(.ant-input-prefix) {
      position: absolute;
      left: 6px;
      top: 3px;
      width: 20px;
      height: 20px;
      margin-right: 0;
      z-index: 1;

      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
  .toolbar-search-icon {
    width: 16px;
    height: 16px;
  }

  .toolbar-search-operation {
    display: flex;
    align-items: center;
    visibility: hidden;
    width: 0;
    height: 0;
    transition: width 0.3s;

    .search-results-sum {
      font-size: 13px;
      font-weight: 400;
      color: #757a85;
      line-height: 18px;
    }

    .search-icon {
      margin-right: 8px;
      width: 20px;
      height: 20px;
      cursor: pointer;

      :deep(svg) {
        width: 100%;
        height: 100%;
      }

      &:hover {
        :deep(svg) {
          path:last-child {
            fill: var(--primary-color);
          }
        }
      }

      &.disabled {
        cursor: not-allowed;

        :deep(svg) {
          path:last-child {
            fill: rgba(3, 10, 26, 0.12);
          }
        }
      }
    }

    .search-close-icon {
      :deep(svg) {
        path:last-child {
          fill: rgba(3, 10, 26, 0.42);
        }
      }
    }
  }
}

.toolbar-search-modal {
  position: absolute;
  top: 6px;
  right: 8px;
  padding: 0 4px 0 6px;
  height: 40px;

  background: #ffffff;
  box-shadow: 0px 6px 18px 0px rgba(3, 10, 26, 0.12);
  border-radius: 4px;

  .toolbar-search-input {
    width: auto;
  }

  .toolbar-search-operation {
    width: auto;
    height: auto;
    visibility: visible;
  }
}
</style>
