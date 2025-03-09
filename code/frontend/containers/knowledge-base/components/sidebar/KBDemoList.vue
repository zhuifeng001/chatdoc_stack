<template>
  <div :class="[$style['doc-list'], 'scroll-bar']">
    <div :class="[$style['document-selection'], 'kb-document-selection']">
      <span>选择</span>
      <a-checkbox>多选</a-checkbox>
    </div>
    <div :class="[$style['doc-list-wrapper'], 'scroll-bar']">
      <div v-if="selectedKBLibrary" :class="[$style['doc-item']]" key="-1">
        <img :src="getFileIcon('kb', selectedKBLibrary.name)" alt="" />
        <div :class="$style['doc-item-wrapper']">
          <div :class="$style['doc-item-title']">{{ selectedKBLibrary.name }}</div>
          <div :class="$style['doc-item-desc']">
            <span>&nbsp;</span>
          </div>
        </div>
      </div>
      <div
        v-for="(source, index) in list"
        :key="source._id"
        :class="[$style['doc-item'], source._active ? $style['active'] : '']"
        @click="onActive(source)"
      >
        <img :src="getFileIcon(source.type, source.title)" alt="" />
        <div :class="$style['doc-item-wrapper']">
          <div :class="$style['doc-item-title']">{{ '样例' + (index + 1) || source.title }}</div>
          <div :class="$style['doc-item-desc']">
            <span> {{ formatDate(source.updateTime) }} </span>
            <a-tooltip title="解析成功">
              <Check fill="#11A35F" theme="filled" />
            </a-tooltip>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import type { PropType } from 'vue'
import { Check } from '@icon-park/vue-next'
import { getFileIcon } from '../../helper'
import { formatDate } from '../../utils/date'
import { useKBStore } from '../../store'
import { storeToRefs } from 'pinia'

const { selectedKBLibrary } = storeToRefs(useKBStore())
const emit = defineEmits(['select', 'active'])

defineProps({
  list: {
    type: Array as PropType<any[]>,
    default: () => []
  }
})
const onActive = source => {
  emit('active', source)
}
</script>
<style lang="less" module>
.doc-list {
  position: relative;
  display: flex;
  flex-direction: column;

  .doc-list-wrapper {
    position: relative !important;
    padding: 0 0 0 10px;
    height: calc(100% - 33px) !important;
    flex-grow: 0;
    overflow-y: scroll !important;
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
</style>
