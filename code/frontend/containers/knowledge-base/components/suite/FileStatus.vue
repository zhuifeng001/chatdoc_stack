<template>
  <div :class="$style['item-status']">
    <template v-if="isFailedFile(source.status)">
      <!-- <a-tooltip overlayClassName="acg-tooltip" :title="type === 'small' ? '文档解析失败，重新解析' : '重试'">
        <ReloadOutlined :class="$style['retry-icon']" @click.stop="onReParse" />
      </a-tooltip> -->
      <a-popover v-if="type !== 'small'" :trigger="['hover']" :show-cancel="false">
        <template v-slot:content>
          <div>
            <ExclamationCircleFilled style="color: #faad14; margin-right: 4px" />
            <span>文档解析失败</span>
          </div>
        </template>
        <template v-slot:okButton> </template>
        <ExclamationCircleOutlined :class="$style['tip-icon']" @click.stop />
      </a-popover>
    </template>
    <template v-else-if="isParsingFile(source.status)">
      <a-tooltip overlayClassName="acg-tooltip" title="文档解析中">
        <Loading3QuartersOutlined :class="[$style['loading-icon'], 'anticon-loading', 'anticon-spin']" @click.stop />
      </a-tooltip>
    </template>
    <template v-else-if="successVisible && isSucceedFile(source.status)">
      <a-tooltip overlayClassName="acg-tooltip" title="文档解析成功">
        <Check :class="$style['success-icon']" theme="filled" @click.stop />
      </a-tooltip>
    </template>
  </div>
</template>
<script lang="ts" setup>
import { Loading3QuartersOutlined, ExclamationCircleFilled } from '@ant-design/icons-vue'
import ReloadOutlined from '../../images/ReloadOutlined.vue'
import ExclamationCircleOutlined from '../../images/ExclamationCircleOutlined.vue'
import { toRefs, type PropType } from 'vue'
import { Check } from '@icon-park/vue-next'
import { FileStatusEnums, isFailedFile, isParsingFile, isSucceedFile } from '../../store/helper'
import { reParseKBDocumentAPI } from '@/api/knowledge-base'
import { useKBStore } from '../../store'

const props = defineProps({
  source: {
    type: Object as PropType<any>,
    required: true
  },
  type: {
    type: String as PropType<'small'>
  },
  successVisible: {
    type: Boolean,
    default: true
  }
})
const { source } = toRefs(props)

const store = useKBStore()

const onReParse = async () => {
  await reParseKBDocumentAPI({ id: source.value.id })
  source.value.status = FileStatusEnums.DOC_PARSED
  store.handleParsingFileList()
  store.refreshFileList()
}
</script>
<style lang="less" module>
.item-status {
  display: flex;
  align-items: center;

  .retry-icon,
  .tip-icon,
  .success-icon {
    width: 14px;
    height: 14px;
    cursor: pointer;
  }

  .retry-icon,
  .tip-icon {
    color: #c96924;
    outline: none;
  }

  .tip-icon {
    margin-left: 4px;
  }

  .loading-icon {
    cursor: pointer;
    font-size: 12px;
    color: var(--primary-color);
  }

  .success-icon {
    color: #11a35f;
    svg {
      width: 14px;
      height: 14px;
    }
  }
}
</style>
