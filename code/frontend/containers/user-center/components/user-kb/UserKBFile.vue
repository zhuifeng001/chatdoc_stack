<template>
  <div :class="[$style['user-kb-item-wrapper'], $style['wrapper']]">
    <a-checkbox v-show="openBatch" :class="$style['item-checkbox']" v-model:checked="source._checked" @click.stop />
    <div :class="$style['item-folder']">
      <div :class="$style['item-image']">
        <img
          v-if="source.extraData?.cover"
          :src="getDocumentImage(source.extraData?.cover)"
          alt=""
          @click.stop="toAsk"
        />
        <img
          v-else
          :class="$style['fallback-img']"
          src="@/assets/images/FileDocumentFilled.svg"
          alt=""
          @click.stop="toAsk"
        />
      </div>
      <div :class="$style['item-info']" @click.stop="toAsk">
        <a-input
          v-if="nameEditing"
          ref="nameRef"
          v-model:value="source.name"
          placeholder="请输入文件夹名称"
          size="small"
          @click.stop
          @pressEnter.stop="folderRename"
          @blur="folderRename"
        ></a-input>
        <div v-else :class="$style['item-name']">
          <a-tooltip v-if="isFailedFile(source.status)" overlayClassName="acg-tooltip" title="文档解析失败">
            <ExclamationCircleFilled :class="$style['error-icon']" />
          </a-tooltip>
          <a-tooltip v-else-if="isParsingFile(source.status)" overlayClassName="acg-tooltip" title="文档解析中">
            <Loading3QuartersOutlined :class="[$style['loading-icon'], 'anticon-loading', 'anticon-spin']" />
          </a-tooltip>
          <a-tooltip overlayClassName="acg-tooltip" :title="source.name">
            {{ source.name }}
          </a-tooltip>
        </div>
        <div :class="$style['item-desc']">
          <div v-if="isParsingFile(source.status)" :class="$style['text-animation-text']">解析中...</div>
          <div v-else>
            <span style="margin-right: 12px">共{{ source.extraData?.pageNumber || 1 }}页</span>
            <span>{{ docSize }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="isSucceedFile(source.status) && !nameEditing" :class="$style['document-btn']">
      <a-button :class="[$style['document-infer'], $style['document-infer-focus']]" type="primary" @click.stop="toAsk">
        <MessageOutlined />
        <span>立即提问</span>
      </a-button>
    </div>
    <UserKBFolderMenu
      v-if="!hiddenMenu && !checkedDocumentByPage?.length"
      :class="$style['item-menu']"
      :source="source"
      :ask-visible="false"
      @fileRenameEdit="fileRenameEdit"
    />
  </div>
</template>
<script lang="ts" setup>
import UserKBFolderMenu from './UserKBFolderMenu.vue'
import { getDocumentImage } from '~/api'
import { useFileStore } from '../../store/useFileStore'
import MessageOutlined from '~/containers/financial/images/MessageOutlined.vue'
import { isFailedFile, isParsingFile, isSucceedFile } from '~/containers/knowledge-base/store/helper'
import ExclamationCircleOutlined from '~/containers/knowledge-base/images/ExclamationCircleOutlined.vue'
import { Loading3QuartersOutlined, ExclamationCircleFilled } from '@ant-design/icons-vue'

const fileStore = useFileStore()
const { openBatch, checkedDocumentByPage } = storeToRefs(fileStore)

const props = defineProps({
  source: {
    type: Object,
    required: true
  },
  hiddenMenu: {
    type: Boolean,
    required: false
  }
})
const { source } = toRefs(props)
const nameEditing = ref(false)
const nameRef = ref()

const docSize = computed(() => {
  const size = props.source.extraData?.documentSize
  if (typeof size !== 'number') return ''
  if (size < 1024) {
    return size + 'B'
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(2) + 'KB'
  } else {
    return (size / 1024 / 1024).toFixed(2) + 'MB'
  }
})
const fileRenameEdit = () => {
  nameEditing.value = true
  setTimeout(() => {
    nameRef.value?.focus()
  })
}
const folderRename = async () => {
  const { data } = await fileStore.updateDocument(props.source.id, props.source.name)
  if (data.name) props.source.name = data.name
  nameEditing.value = false
}

const toAsk = () => {
  if (isSucceedFile(source.value.status) && !nameEditing.value) {
    fileStore.toAsk({ ids: [source.value.id] })
  }
}
</script>
<style lang="less" module>
@import '../../styles/file.less';

.user-kb-item-wrapper {
  margin: 0 12px 12px 0;
  width: 180px;
  height: 180px;

  cursor: pointer;

  .item-checkbox {
    position: absolute;
    left: 0;
    top: 0;
    font-size: 0;
    z-index: 1;

    :global {
      .ant-checkbox {
        top: 0px;
        left: 0px;
        width: 18px;
        height: 18px;

        &.ant-checkbox-checked::after,
        .ant-checkbox-inner {
          border-radius: 4px 0px 4px 0px;
        }

        .ant-checkbox-inner {
          width: 100%;
          height: 100%;
          background: linear-gradient(138deg, #e5eaf2 0%, #f5f8fc 100%);
          border-color: #a9c6ff !important;
        }

        &:hover {
          .ant-checkbox-inner {
            border-color: var(--primary-color) !important;
          }
        }

        &.ant-checkbox-checked {
          .ant-checkbox-inner {
            background: linear-gradient(360deg, #6699ff 0%, #1a66ff 100%);
            border: 0;
            &::after {
              background-color: transparent;
              top: 46%;
              left: 25%;
              width: 5.5px;
              height: 10px;
            }
          }
        }
      }

      .ant-checkbox-checked::after {
        border-color: transparent !important;
      }
    }
  }

  .item-folder {
    height: 100%;
    box-shadow: #f0f0f0 0px 0px 8px 0px;

    &:hover {
      box-shadow: #a3c6ff 0px 0px 8px 0px;

      .item-image {
        img {
          transform: scale(1.05);
          transition: all 0.3s;
        }
      }
    }
  }

  .item-image {
    width: 100%;
    height: calc(100% - 52px);
    background: #e1e4eb;
    border-radius: 3px 3px 0px 0px;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      margin: 4px;
      max-width: calc(100% - 8px);
      max-height: calc(100% - 8px);
    }

    .fallback-img {
      width: 64px;
      height: 64px;
    }
  }
  .item-info {
    padding: 8px 12px;
    height: 52px;
    background: #f2f5fa;
    border-radius: 0px 0px 3px 3px;

    .item-name {
      font-size: 14px;
      font-weight: 400;
      color: #030a1a;
      line-height: 20px;
      display: flex;
      align-items: center;

      span {
        max-width: calc(100% - 20px);
        display: inline-block;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      > span:nth-of-type(2) {
        margin-left: 8px;
      }
    }

    .item-desc {
      font-size: 12px;
      font-weight: 400;
      color: #757a85;
      line-height: 16px;
    }
  }
  .item-menu {
    display: none;
  }

  &:hover {
    .item-menu {
      display: flex;
    }
  }
}

.loading-icon {
  font-size: 12px;
  color: var(--primary-color);
}
.error-icon {
  position: relative;
  top: -1px;
  font-size: 12px;
  width: 12px;
  height: 12px;
  color: #faad14;
}
@keyframes blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.text-animation-text {
  white-space: nowrap;
  animation: blink 1s linear infinite;
  transition: opacity 0.2s;
}
</style>
