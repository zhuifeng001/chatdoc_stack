<template>
  <div :class="$style['financial-search-module']">
    <!-- <div class="text-3xl leading-[42px] text-left font-bold mb-4">报告搜索结果</div> -->
    <div :class="[$style['financial-search-wrapper'], $style['large-wrapper']]">
      <a-input
        :class="$style['search-input']"
        v-model:value="searchValue"
        placeholder="搜索公司名、关键词、年份"
        clearable
        @clear="handleClear"
        @pressEnter="onSearch"
      />
      <Search :class="$style['financial-search-icon']" @click="onSearch" />
      <a-button :class="$style['financial-search-enter']" type="primary" @click="onSearch"> 搜 索</a-button>
      <div :class="$style['hot-keywords']">
        <span class="text-gray-500 mr-1">热门搜索: </span>
        <span v-for="key in hotSpotsData" :key="key" :class="$style.value" @click="setKeyword(key)">{{ key }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import Search from '@/containers/knowledge-base/images/search.vue'
import { ref } from 'vue'
import { hotKeywords } from '../../helpers'
import { useRoute } from 'vue-router'
const query = useRoute().query
const searchValue = ref<string>(String(query.keyword) || '')
const router = useRouter()

const { data: hotSpotsData } = useNuxtData('hotSpotsData')

const emit = defineEmits(['search'])

const handleClear = () => {
  searchValue.value = ''
}

const onSearch = (need_track: boolean = true) => {
  const newQuery = searchValue.value || ''
  emit('search', newQuery)
  need_track && newQuery && track({ name: '文档搜索', keyword: newQuery, page: '搜索页', filter: '关键词' })
  router.replace({ query: { keyword: newQuery } })
}

const setKeyword = (key: string) => {
  track({ name: '文档搜索', keyword: key, page: '搜索页', filter: '热门搜索' })
  searchValue.value = key
  onSearch(false)
}
</script>
<style lang="less" module>
.financial-search-module {
  width: 100%;
  max-width: var(--max-width);
  text-align: center;
  margin: 0 auto;
  padding: 0 60px;
}
.financial-search-wrapper {
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

  .financial-search-icon {
    position: absolute;
    left: 16px;
    top: 13px;
    width: 23px;
    height: 23px;
    z-index: 1;
    color: #868d9b;
  }

  .financial-search-enter {
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

.large-wrapper {
  width: 574px;
  background: #f2f4f7;
  border-radius: 24px;
  border: 1px solid transparent;
  backdrop-filter: blur(8px);

  .search-input {
    background: transparent;
    border: transparent;
  }
}

.hot-keywords {
  margin: 12px auto 0;
  padding: 0 0;
  text-align: center;
  white-space: nowrap;

  .label,
  .value {
    font-size: 14px;
    font-weight: 400;
    color: #757a85;
    line-height: 20px;
  }
  .label {
    margin-right: 4px;
  }
  .value {
    padding: 4px 12px;
    margin-right: 8px;
    background: #f2f4f7;
    box-shadow: 0px 0px 20px -5px rgba(19, 18, 60, 0.14);
    border: 1px solid rgba(255, 255, 255, 0.5);
    font-size: 13px;
    cursor: pointer;

    &:hover {
      color: var(--primary-color);
    }

    &:last-child {
      margin-right: 0;
    }
  }
}
</style>
