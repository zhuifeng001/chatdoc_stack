<template>
  <div :class="[$style['user-kb-item-wrapper'], $style['wrapper']]" @click="enterFolder">
    <a-checkbox v-show="openBatch" :class="$style['item-checkbox']" v-model:checked="source._checked" @click.stop />
    <div :class="$style['item-folder']">
      <div :class="$style['item-image']">
        <img src="@/assets/images/FolderOutlined.svg" alt="" />
      </div>
      <div :class="$style['item-info']">
        <a-input
          v-if="nameEditing"
          ref="nameRef"
          v-model:value="source.name"
          placeholder="请输入文件夹名称"
          size="small"
          @click.stop
          @pressEnter.stop="e => (e?.target as HTMLElement)?.blur?.()"
          @blur="folderRename"
        ></a-input>
        <div v-else :class="$style['item-name']" :title="source.name">{{ source.name }}</div>
        <div :class="$style['item-desc']">共{{ source.documentCount || 0 }}个文件</div>
      </div>
      <div v-if="!nameEditing && source.documentCount" :class="$style['document-btn']">
        <a-button :class="[$style['document-infer'], $style['document-infer-focus']]" type="primary" @click.stop="toA">
          <MessageOutlined />
          <span>立即提问</span>
        </a-button>
      </div>
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
import { useFileStore } from '../../store/useFileStore'
import { useMyLibrary } from '../../store/useMyLibrary'
import MessageOutlined from '~/containers/financial/images/MessageOutlined.vue'

const fileStore = useFileStore()
const { openBatch, checkedDocumentByPage } = storeToRefs(fileStore)
const libraryStore = useMyLibrary()

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

const nameEditing = ref(false)
const nameRef = ref()
const route = useRoute()

const enterFolder = () => {
  const match = route.path.match(/([a-zA-Z0-9]*)\/user-kb/)
  if (match && props.source.id) {
    navigateTo(`/${match[1]}/user-kb/${props.source.id}`)
  }
}

const fileRenameEdit = () => {
  nameEditing.value = true
  setTimeout(() => {
    nameRef.value?.focus()
  })
}

const folderRename = async () => {
  const { data } = await fileStore.updateFolder(props.source.id, props.source.name)
  if (data.name) props.source.name = data.name
  libraryStore.getMyLibraryData()
  nameEditing.value = false
}

const toA = () => {
  fileStore.toAsk({ folderIds: [props.source.id] })
}
</script>
<style lang="less" module>
@import '../../styles/file.less';

.user-kb-item-wrapper {
  margin: 0 12px 12px 1px;
  width: 180px;
  height: 180px;
  position: relative;
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
      max-width: 100%;
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
</style>
