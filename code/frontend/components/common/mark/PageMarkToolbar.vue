<template>
  <div class="toolbar page-mark-toolbar">
    <slot name="left" />
    <div class="toolbar-wrapper">
      <div class="toolbar-operation">
        <div class="toolbar-doc">
          <a-tooltip placement="bottom" overlayClassName="acg-tooltip" title="上一页">
            <i
              class="toolbar-arrow el-icon-arrow-left"
              :class="{ disabled: pageIndex === 1 }"
              @click="emit('prev', pageIndex - 1)"
            >
              <Left class="!flex items-center justify-center" />
            </i>
          </a-tooltip>
          <span class="toolbar-input">
            <input
              :value="pageIndex"
              class="form-control cur-input"
              type="number"
              min="1"
              :max="max"
              @input="onInput"
              @blur="onBlur"
            />
            <i class="gap-line">/</i>
            <span class="max-txt">{{ max }}</span>
          </span>
          <a-tooltip placement="bottom" overlayClassName="acg-tooltip" title="下一页">
            <i
              class="toolbar-arrow el-icon-arrow-right"
              :class="{ disabled: pageIndex === max }"
              @click="emit('next', pageIndex + 1)"
            >
              <Right class="!flex items-center justify-center" />
            </i>
          </a-tooltip>
        </div>
        <div class="operation-btn">
          <PageMarkToolbarOperation @download="emit('download')" v-bind="operationProps">
            <template v-slot:extension>
              <slot name="extension" />
            </template>
          </PageMarkToolbarOperation>
        </div>
        <span v-if="documentInfo?.name" class="document-name">
          <a-popover placement="bottom" overlayClassName="acg-popover" :content="`${documentInfo.name}`">
            <!-- <InfoCircleOutlined /> -->
            {{ documentInfo.name }}
          </a-popover>
        </span>
      </div>
      <PageMarkToolbarSearch />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { toRefs, type PropType, ref, getCurrentInstance, onBeforeUnmount, provide } from 'vue'
import PageMarkToolbarOperation from './PageMarkToolbarOperation.vue'
import PageMarkToolbarSearch from './PageMarkToolbarSearch.vue'
import type { OperationProps } from './types'
import { message } from 'ant-design-vue'
import { Left, Right } from '@icon-park/vue-next'
import type { PageItem } from '@intsig/canvas-mark'
import { useInject } from '@/hooks/useInject'

const props = defineProps({
  pageIndex: {
    type: [Number],
    required: true
  },
  textVisible: {
    type: Boolean,
    default: false
  },
  max: {
    type: Number,
    default: 0
  },
  operationProps: {
    type: Object as PropType<OperationProps>,
    default: () => ({})
  }
})
const emit = defineEmits(['update:page-index', 'update:text-visible', 'prev', 'next', 'download'])
const { documentInfo } = useInject<{ documentInfo: Ref<{ name: string }> }>(['documentInfo'])

const { max, pageIndex } = toRefs(props)

function onInput(e) {
  const value = e.target.value?.trim()
  if (!value) return

  let page = parseInt(value) || 1

  if (page < 1) {
    page = 1
  }

  if (page > max.value) {
    message.destroy()
    message.warning({
      content: `标准文档最大页码为${max.value}`,
      duration: 2
    })
    page = max.value
  }

  e.target.value = page
  emit('update:page-index', page)
}
function onBlur(e) {
  e.target.value = pageIndex.value
}
</script>
<style lang="less" scoped>
.page-mark-toolbar {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1;
}

.toolbar {
  height: 40px;
  display: flex;
  align-items: stretch;
  background: #f2f4f7;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);

  .toolbar-wrapper {
    padding: 0 20px 0 12px;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;

    overflow: hidden;
  }

  .toolbar-operation {
    display: flex;
    align-items: center;
    flex: 1;

    .document-name {
      cursor: default;

      :deep(span) {
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
        word-break: break-all;
      }
    }
  }

  a {
    user-select: none;
  }

  .operation-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 8px;

    &::before
    // , &::after
    {
      content: '';
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 1px;
      height: 20px;
      background: #e1e4eb;
    }

    &::before {
      left: 0;
    }
    &::after {
      right: 0;
    }
  }
  b.show-text {
    margin-left: 8px;
    min-width: 70px;
    text-align: left;

    a {
      color: var(--primary-color);
      line-height: 22px;
      font-weight: 400;
      display: inline-block;
      cursor: pointer;
      white-space: nowrap;

      &:hover {
        text-decoration: underline;
      }
    }
  }
  .toolbar-doc {
    margin-right: 2px;
    text-align: center;
    display: flex;
    align-items: center;
    color: #3a415c;
    .toolbar-arrow {
      cursor: pointer;
      width: 25px;
      height: 24px;
      line-height: 24px;
      font-size: 16px;
      color: #3a415c;
      &:hover {
        color: var(--primary-color);
      }
      &.disabled {
        cursor: not-allowed;
        color: #cacad4;
      }

      .i-icon {
        display: block;
        width: 100%;
        height: 100%;
      }
    }
    .toolbar-input {
      margin: 0 3px;
      white-space: nowrap;
      line-height: 32px;
      user-select: none;
      .cur-input {
        display: inline-block;
        min-width: 32px;
        max-width: 40px;
        height: 24px;
        line-height: 24px;
        padding: 2px;
        text-align: center;

        background: #ffffff;
        border-radius: 2px;
        border: 1px solid #e1e4eb;

        &:focus {
          box-shadow: none;
          border-color: var(--primary-color);
        }

        &::-webkit-outer-spin-button,
        &::-webkit-inner-spin-button {
          -webkit-appearance: none;
        }
        -moz-appearance: textfield;
      }
      .gap-line {
        display: inline-block;
        margin: 0 8px;
      }
      .max-txt {
        display: inline-block;
        min-width: 16px;
      }
    }
  }
}
</style>
