<template>
  <div :class="$style['center-search-module']">
    <div :class="[$style['center-search-wrapper']]">
      <a-input
        :class="$style['search-input']"
        v-model:value="searchValue"
        placeholder="搜索公司名、关键词、年份"
        clearable
        @clear="handleClear"
        @search="handleSearch"
        @pressEnter="handleSearch"
      />
      <Search :class="$style['center-search-icon']" />
      <a-button :class="$style['center-search-enter']" type="primary">
        <NuxtLink :to="`/financial/search?keyword=${searchValue}`" target="_self">搜 索</NuxtLink>
      </a-button>
    </div>
    <div :class="$style['hot-keywords']">
      <span :class="$style['label']">热门搜索：</span>
      <NuxtLink
        v-for="key in hotSpotsData"
        :key="key"
        :class="$style['value']"
        :to="`/financial/search?keyword=${key}`"
        @click="onSearchHot(key)"
      >
        <!-- :to="`/financial-search?keyword=${key}`" -->
        <!-- target="_blank" -->
        {{ key }}
      </NuxtLink>
    </div>
  </div>
</template>
<script lang="ts" setup>
import Search from '@/containers/knowledge-base/images/search.vue'
import { ref } from 'vue'
import { hotKeywords } from '../../helpers'
const router = useRouter()

const { data: hotSpotsData } = useNuxtData('hotSpotsData')
const searchValue = ref('')
const handleClear = () => {
  searchValue.value = ''
}
const handleSearch = () => {
  searchValue.value && track({ name: '文档搜索', keyword: searchValue.value, page: '首页', filter: '关键词' })
  router.push(`/financial/search?keyword=${searchValue.value}`)
  // window.open(`/financial/search?keyword=${searchValue.value}`)
}
const onSearchHot = hot => {
  track({ name: '文档搜索', keyword: hot, page: '首页', filter: '热门搜索' })
}

onDeactivated(() => {
  searchValue.value = ''
})
onUnmounted(() => {
  searchValue.value = ''
})
</script>
<style lang="less" module>
.center-search-module {
  text-align: center;
  margin-bottom: 20px;
}
.center-search-wrapper {
  position: relative;
  display: inline-block;
  width: 574px;
  height: 48px;

  .search-input {
    padding: 0 90px 0 50px;
    height: 48px;

    font-size: 16px;
    background: linear-gradient(90deg, #f9fbff 0%, #f7f9fe 100%);
    box-shadow: 4px 12px 30px 0px rgba(61, 92, 153, 0.1);
    border-radius: 24px;
    border: 1px solid #ffffff;
    backdrop-filter: blur(8px);
  }

  .center-search-icon {
    position: absolute;
    left: 16px;
    top: 13px;
    width: 23px;
    height: 23px;
    z-index: 1;
    color: #868d9b;
  }

  .center-search-enter {
    position: absolute;
    top: 4px;
    right: 4px;
    padding: 0 20px;
    height: 40px;
    border-radius: 40px;
    font-size: 16px;
    font-weight: 400;
    color: #ffffff;
    line-height: 24px;
  }
}

.hot-keywords {
  margin-top: 12px;
  text-align: center;

  .label,
  .value {
    font-size: 14px;
    font-weight: 400;
    color: var(--primary-color);
    line-height: 20px;
  }
  .label {
    margin-right: 4px;
  }
  .value {
    padding: 2px 12px;
    margin-right: 8px;
    background: #e0ebff;
    box-shadow: 0px 0px 20px -5px rgba(19, 18, 60, 0.14);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.5);
    font-size: 13px;
    cursor: pointer;

    &:hover {
      background: #cfe0ff;
    }

    &:last-child {
      margin-right: 0;
    }
  }
}
</style>
