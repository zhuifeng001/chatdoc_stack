<template>
  <div :class="$style['selected-document-item']">
    <img :class="$style.left" :src="getFileIcon(source.type, source.title)" alt="" />
    <div :class="$style.right">
      <div :class="$style['document-name']" :title="source.name">
        {{ source.name }}
        <!-- {{ source.extraData?.stockSymbol ? `(${source.extraData?.stockSymbol})` : '&nbsp;' }} -->
      </div>
      <div :class="$style['document-extra']">
        <ClockCircleOutlined />
        <span>{{ formatDate(source.extraData.financeDate, 'YYYY/MM/DD') }}</span>
        <CopyOutlined />
        <span>{{ source.extraData?.pageNumber || 1 }} 页</span>
      </div>
    </div>
    <CloseOutlined
      :class="[$style['delete-icon'], 'primary-color-hover']"
      @click="financialStore.removeDocument(source.id)"
    />
  </div>
</template>
<script lang="ts" setup>
import { getFileIcon } from '@/containers/knowledge-base/helper'
import ClockCircleOutlined from '../../images/ClockCircleOutlined.vue'
import CopyOutlined from '../../images/CopyOutlined.vue'
import CloseOutlined from '@/containers/knowledge-base/images/CloseOutlined.vue'
import { useFinancialStore } from '../../store'

const financialStore = useFinancialStore()
const { selectedDocuments } = storeToRefs(financialStore)

defineProps({
  source: {
    type: Object as PropType<any>,
    required: true
  }
})
</script>
<style lang="less" module>
.selected-document-item {
  position: relative;
  margin-bottom: 4px;
  padding: 8px;
  width: 260px;
  height: 60px;
  background: linear-gradient(90deg, #fafbfd 0%, #ffebeb 100%);
  display: flex;
  justify-content: flex-start;

  &:last-child {
    margin-bottom: 0;
  }

  .left {
    margin-right: 4px;
    width: 20px;
    height: 20px;
  }
  .right {
    flex: 0;
    width: calc(100% - 50px);

    .document-name {
      font-size: 14px;
      font-weight: 500;
      color: #000000;
      line-height: 20px;

      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-all;
    }
    .document-extra {
      margin-top: 8px;
      margin-bottom: 16px;
      font-size: 12px;
      font-weight: 400;
      color: #757a85;
      line-height: 16px;
      display: flex;
      align-items: center;

      svg {
        margin-right: 8px;
        margin-left: 12px;
        &:first-child {
          margin-left: 0;
        }
      }

      span {
        white-space: nowrap;
      }
    }
  }

  .delete-icon {
    position: absolute;
    right: 12px;
    top: 8px;
    width: 20px;
    height: 20px;
  }
}
</style>
