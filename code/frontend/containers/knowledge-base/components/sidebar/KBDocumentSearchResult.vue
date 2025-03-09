<template>
  <div :class="[$style['doc-search-results'], 'scroll-bar', !searchResults.length ? $style['search-empty'] : '']">
    <div :class="$style['doc-search-sum']">共 {{ searchResults.length }} 条搜索条结果</div>
    <div
      v-for="source in searchResults"
      :key="source.id"
      :class="[$style['doc-item'], source._active ? $style['active'] : '']"
      @click="onActive(source)"
    >
      <a-checkbox
        :class="$style['item-checkbox']"
        :checked="source._checked"
        @change="onCheckedChange(source)"
        @click.stop
      ></a-checkbox>
      <div :class="$style['doc-item-container']">
        <img :src="getFileIcon(source.type, source.title)" alt="" />
        <div :class="$style['doc-item-wrapper']">
          <div :class="$style['doc-item-title']">{{ source.title }}</div>
          <div :class="$style['doc-item-desc']">
            <span> {{ formatDate(source.updateTime) }} </span>
            <a-tooltip title="解析成功">
              <Check fill="#11A35F" theme="filled" />
            </a-tooltip>
          </div>
        </div>
      </div>
    </div>
    <div v-if="searchResults.length" :class="[$style['doc-search-no-more']]">- 没有更多了 -</div>
    <KBDocumentSearchEmpty v-if="!searchResults.length" />
    <div v-else :class="$style['doc-search-footer']">
      <div :class="$style.line">
        <a-checkbox
          :class="$style['checkbox-all']"
          :checked="checkAll"
          :indeterminate="indeterminate"
          @change="onCheckedAll"
          >全选</a-checkbox
        >
        <span>
          已选择 <span style="color: var(--primary-color)">{{ checkNum }}</span> 个文件
        </span>
      </div>
      <div :class="$style.line">
        <a-button type="link" @click="cancelChecked">取消选择</a-button>
        <a-button type="primary" @click="addKbFiles">添加到对话列表</a-button>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, type PropType, computed } from 'vue'
import { Check } from '@icon-park/vue-next'
import KBDocumentSearchEmpty from './KBDocumentSearchEmpty.vue'
import { getFileIcon } from '../../helper'
import { storeToRefs } from 'pinia'
import { useKBStore } from '../../store'
import { formatDate } from '../../utils/date'

const emit = defineEmits(['select', 'active'])

const store = useKBStore()
const { searchResults } = storeToRefs(store)

const onActive = source => {
  emit('active', source)
}

const onCheckedChange = source => {
  source._checked = !source._checked
}

const checkAll = computed(() => searchResults.value.every(o => o._checked))
const checkNum = computed(() => searchResults.value.filter(o => o._checked).length)
const indeterminate = computed(
  () =>
    !!searchResults.value?.length &&
    !searchResults.value.every(o => o._checked) &&
    searchResults.value.some(o => o._checked)
)
const onCheckedAll = e => {
  searchResults.value.forEach(o => (o._checked = e.target.checked))
}
const cancelChecked = () => {
  searchResults.value.forEach(o => (o._checked = false))
}
const addKbFiles = () => {
  const checkedFiles = searchResults.value.filter(o => o._checked)
  store.addFileIntoKB(checkedFiles)
  store.resetSearchStatus()
}
</script>
<style lang="less" module>
.doc-search-results {
  position: relative !important;
  padding: 0 0px 0 10px;
  height: 100%;
  overflow-y: scroll !important;

  &.search-empty {
    padding: 0 12px 0 20px;
    height: 100%;

    display: flex;
    flex-direction: column;

    .doc-search-sum {
      margin: 0 0 0 0;
      font-size: 12px;
      font-weight: 400;
      color: #959ba6;
      line-height: 18px;
    }
  }

  .doc-item {
    position: relative;
    display: flex;
    cursor: pointer;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 4px;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 10px;
      width: calc(100% - 20px);
      height: 1px;
      background: #e1e4eb;
    }

    img {
      margin-right: 4px;
      width: 20px;
      height: 20px;
    }

    &.active,
    &:hover {
      background: #e0ebff;
      .doc-item-wrapper {
        .doc-item-title {
          color: var(--primary-color);
        }
      }
    }
  }
}

.doc-item-container {
  margin-left: 8px;
  display: flex;
  width: calc(100% - 24px);
  flex: 1;
}

.doc-item-wrapper {
  width: calc(100% - 24px);
  .doc-item-title {
    font-size: 14px;
    font-weight: 500;
    color: #000000;
    line-height: 20px;

    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .doc-item-desc {
    font-size: 12px;
    font-weight: 400;
    color: #000000;
    line-height: 16px;
    display: flex;
    justify-content: space-between;

    svg {
      font-size: 14px;
    }
  }
}

.doc-search-no-more {
  margin-top: 16px;
  font-size: 12px;
  font-weight: 400;
  color: #b2b7c2;
  line-height: 18px;
  text-align: center;
}
.doc-search-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  padding: 20px 20px 8px;
  width: 100%;
  height: 104px;
  background: #ffffff;
  .line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    :global {
      .ant-btn-link {
        padding: 0;
      }
    }
  }
}
</style>
