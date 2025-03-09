<template>
  <div :class="$style['user-kb-tabs-extra']">
    <a-dropdown :getPopupContainer="node => node.parentElement as HTMLElement" placement="bottomRight">
      <div :class="[$style['ant-dropdown-item'], currentFileType ? $style['selected'] : '']" @click.prevent>
        <span :class="$style.label">{{ KBFileTypeNameMap[currentFileType] || '文件类型' }}</span>
        <Down />
      </div>
      <template #overlay>
        <div :class="$style['file-type-wrapper']">
          <div :class="$style['file-type-label']">文件类型</div>
          <a-menu @select="onSelectFileType" v-model:selectedKeys="selectedKeys">
            <a-menu-item :class="[$style['menu-item'], currentFileType === '' ? $style['active'] : '']" :key="''">
              <span>默认</span>
              <Check />
            </a-menu-item>
            <a-menu-item
              :class="[$style['menu-item'], currentFileType === KBFileTypeEnums.FOLDER ? $style['active'] : '']"
              :key="KBFileTypeEnums.FOLDER"
            >
              <span>{{ KBFileTypeNameMap[KBFileTypeEnums.FOLDER] }}</span>
              <Check />
            </a-menu-item>
            <a-menu-item
              :class="[$style['menu-item'], currentFileType === KBFileTypeEnums.FILE ? $style['active'] : '']"
              :key="KBFileTypeEnums.FILE"
            >
              <span>{{ KBFileTypeNameMap[KBFileTypeEnums.FILE] }}</span>
              <Check />
            </a-menu-item>
            <a-menu-item
              :class="[$style['menu-item'], currentFileType === KBFileTypeEnums.IMAGE ? $style['active'] : '']"
              :key="KBFileTypeEnums.IMAGE"
            >
              <span>{{ KBFileTypeNameMap[KBFileTypeEnums.IMAGE] }}</span>
              <Check />
            </a-menu-item>
          </a-menu>
        </div>
      </template>
    </a-dropdown>
    <a-dropdown :getPopupContainer="node => node.parentElement as HTMLElement" placement="bottomRight" v-if="!noSort">
      <div :class="[$style['ant-dropdown-item'], sortType ? $style['selected'] : '']" @click.prevent>
        <span :class="$style.label">{{ KBSortNameMap[sortType] || '排序类型' }}</span>
        <Down />
      </div>
      <template #overlay>
        <div :class="$style['file-type-wrapper']">
          <div :class="$style['file-type-label']">排序类型</div>
          <a-menu @select="onSelectSortType">
            <a-menu-item :class="[$style['menu-item'], sortType === '' ? $style['active'] : '']" :key="''">
              <span>默认</span>
              <Check />
            </a-menu-item>
            <a-menu-item
              :class="[$style['menu-item'], sortType === KBSortEnums.UPDATE_TIME ? $style['active'] : '']"
              :key="KBSortEnums.UPDATE_TIME"
            >
              <span>{{ KBSortNameMap[KBSortEnums.UPDATE_TIME] }}</span>
              <Check />
            </a-menu-item>
            <a-menu-item
              :class="[$style['menu-item'], sortType === KBSortEnums.CREATE_TIME ? $style['active'] : '']"
              :key="KBSortEnums.CREATE_TIME"
            >
              <span>{{ KBSortNameMap[KBSortEnums.CREATE_TIME] }}</span>
              <Check />
            </a-menu-item>
            <a-menu-item
              :class="[$style['menu-item'], sortType === KBSortEnums.FILE_SIZE ? $style['active'] : '']"
              :key="KBSortEnums.FILE_SIZE"
            >
              <span>{{ KBSortNameMap[KBSortEnums.FILE_SIZE] }}</span>
              <Check />
            </a-menu-item>
            <a-menu-item
              :class="[$style['menu-item'], sortType === KBSortEnums.NAME ? $style['active'] : '']"
              :key="KBSortEnums.NAME"
            >
              <span>{{ KBSortNameMap[KBSortEnums.NAME] }}</span>
              <Check />
            </a-menu-item>
          </a-menu>
        </div>
      </template>
    </a-dropdown>
    <!-- <img
      :class="$style['switch-list-type']"
      v-show="listType === 'folder'"
      src="../../images/TableListOutlined.svg"
      @click="onSelectedListType('table')"
    />
    <img
      :class="$style['switch-list-type']"
      v-show="listType === 'table'"
      src="../../images/FolderListOutlined.svg"
      @click="onSelectedListType('folder')"
    /> -->
  </div>
</template>
<script lang="ts" setup>
import { Down, Check } from '@icon-park/vue-next'
import { KBFileTypeEnums, KBFileTypeNameMap, KBSortEnums, KBSortNameMap } from '../../helpers'
import { useFileStore } from '../../store/useFileStore'
import { filterFolderFileList } from './../../helpers/user-folder-file'

const prop = defineProps({
  noSort: {
    type: Boolean
  },
  activeKey: {
    type: [Number, String]
  }
})

const fileStore = useFileStore()
const { dataList, originalList, listSearchCondition } = storeToRefs(fileStore)
const currentFileType = ref<KBFileTypeEnums | ''>('')
const selectedKeys = ref<string[]>([''])
// 文件类型前端过滤
const onSelectFileType = a => {
  currentFileType.value = a.key
  dataList.value = filterFolderFileList(originalList.value, a.key)
}

const sortType = ref<KBSortEnums | ''>('')
const onSelectSortType = a => {
  sortType.value = a.key
  Object.assign(listSearchCondition.value, {
    sort: a.key || undefined
  })
  fileStore.getFolderFile()
}

const listType = ref<'table' | 'folder'>('folder')
const onSelectedListType = v => {
  listType.value = v
}

watch(
  () => prop.activeKey,
  val => {
    currentFileType.value = ''
    selectedKeys.value = ['']
  },
  { immediate: true }
)
</script>
<style lang="less" module>
.user-kb-tabs-extra {
  display: flex;
  align-items: center;
  justify-content: space-between;

  > * {
    margin-right: 8px;
  }
}

.switch-list-type {
  width: 20px;
  height: 20px;
  cursor: pointer;
}
.ant-dropdown-item {
  padding: 4px 8px;
  display: flex;
  align-items: center;
  cursor: pointer;

  svg {
    margin-left: 4px;
    color: #959ba6;
  }

  &.selected {
    background: #f2f4f7;
  }
}

.file-type-wrapper {
  width: 160px;
  background: #ffffff;
  box-shadow: 0px 6px 18px 0px rgba(3, 10, 26, 0.12);
  border-radius: 4px;
  .file-type-label {
    padding: 12px 0 4px 12px;
    font-size: 12px;
    font-weight: 400;
    color: #757a85;
    line-height: 16px;
  }

  .menu-item {
    svg {
      display: none;
    }
  }

  .active {
    background: #f2f4f7;
    svg {
      display: inline-block;
      color: var(--primary-color);
    }
  }

  :global {
    .ant-menu {
      width: 160px;
      border: 0;

      .ant-menu-title-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .ant-menu-item {
        margin: 0;
        &:hover {
          background: #e0ebff;
        }

        &.ant-menu-item-selected {
          background: #f2f4f7;
        }
      }
    }
  }
}
</style>
