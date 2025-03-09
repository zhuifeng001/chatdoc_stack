<template>
  <ClientOnly>
    <a-menu
      :class="$style['user-center-sidebar']"
      v-model:openKeys="openKeys"
      v-model:selectedKeys="selectedKeys"
      mode="inline"
      :inlineIndent="0"
      @click="handleClick"
    >
      <!-- <a-sub-menu
        key="/user-center/user-kb"
        :class="[$style['menu'], route.path.includes(userKBPath) ? 'user-sidebar-menu-active' : '']"
      >
        <template #expandIcon></template>
        <template #icon>
          <UserOutlined2 :class="$style['menu-icon']" />
        </template>
        <template #title>
          <div :class="$style.wrapper">
            <NuxtLink to="/user-center/user-kb" @Click="onTitleClick">
              我的知识库{{ myLibraryData?.documentCount ? ` (${myLibraryData?.documentCount})` : '' }}
            </NuxtLink>
            <a-tooltip placement="top" overlayClassName="acg-tooltip" title="新建文件夹">
              <PlusOutlined :class="$style['plus-icon']" @click.stop="addFolder" />
            </a-tooltip>
          </div>
        </template>
        <a-menu-item key="sub1-tree" :class="$style['document-tree-menu']">
          <div :class="$style['tree-menu-box']">
            <div :class="$style['tree-menu-body']">
              <DocumentTreeMenu @selectItem="selectItem" />
            </div>
          </div>
        </a-menu-item>
      </a-sub-menu> -->
      <a-menu-item key="/user-center/global-qa-records">
        <template #icon>
          <PositiveDynamics :class="$style['menu-icon']" size="18" />
        </template>
        <NuxtLink to="/user-center/global-qa-records">全局问答记录</NuxtLink>
      </a-menu-item>
      <a-menu-item key="/user-center/qa-records">
        <template #icon>
          <UserOutlined1 :class="$style['menu-icon']" />
        </template>
        <NuxtLink to="/user-center/qa-records">文档问答记录</NuxtLink>
      </a-menu-item>
      <!-- <a-menu-item key="/user-center">
        <template #icon>
          <UserOutlined0 :class="$style['menu-icon']" />
        </template>
        <NuxtLink to="/user-center">概览</NuxtLink>
      </a-menu-item> -->
    </a-menu>
  </ClientOnly>
</template>
<script lang="ts" setup>
import { ref, watch } from 'vue'
import { message, type MenuProps } from 'ant-design-vue'
import DocumentTreeMenu from '../main/DocumentTreeMenu.vue'
import ArrowRightOutlined from '~/containers/knowledge-base/images/ArrowRightOutlined.vue'
import UserOutlined0 from '../../images/UserOutlined0.vue'
import UserOutlined1 from '../../images/UserOutlined1.vue'
import UserOutlined2 from '../../images/UserOutlined2.vue'
import { useMyLibrary } from '../../store/useMyLibrary'
import PlusOutlined from '../../images/PlusOutlined.vue'
import { useFileStore } from '../../store/useFileStore'
import { PositiveDynamics } from '@icon-park/vue-next'

const libraryStore = useMyLibrary()
const { myLibraryData } = storeToRefs(libraryStore)
const fileStore = useFileStore()
const { dataList } = storeToRefs(fileStore)
const route = useRoute()

const userKBPath = '/user-center/user-kb'
const selectedKeys = ref<string[]>([route.path])
const openKeys = ref<string[]>([userKBPath])
const handleClick: MenuProps['onClick'] = e => {
  // console.log('click', e)
}
const selectItem = node => {
  navigateTo(`/user-center/user-kb/${node.id}`)
}
const onTitleClick = (e: Event) => {
  if (route.path !== userKBPath) {
    e.stopPropagation()
  }
}

const router = useRouter()
const addFolder = async () => {
  if ((myLibraryData.value?.children.length || 0) >= 20) {
    message.error('文件夹个数不能多于20个')
    return
  }
  const parentId = undefined // 只有一级目录
  const folderItem = await fileStore.addFolder('新建文件夹', parentId)
  router.push(`/user-center/user-kb/${folderItem.id}`)
  await libraryStore.getMyLibraryData()
  // 默认打开编辑模式
  if (myLibraryData.value?.children?.length) {
    await nextTick()
    myLibraryData.value.children[0].nameEditing = true
  }

  if (!route.params.id) {
    fileStore.getFolderFile()
  }
}
watch(
  () => route.path,
  val => {
    selectedKeys.value = [val]
  }
)
</script>
<style lang="less" module>
@import '~/assets/styles/custom.less';

.user-center-sidebar {
  .menu-icon {
    width: 20px;
    height: 20px;
    color: #9fa4b0;
    transition: color 0.3s;
  }

  :global {
    .ant-menu-item {
      padding-right: 0px !important;
    }

    .ant-menu-item,
    .ant-menu-submenu-title {
      margin: 0 !important;
      padding-left: 20px !important;

      &:active,
      &:hover {
        color: var(--primary-color);
        background: transparent;

        .ant-menu-item-icon {
          color: var(--primary-color);
        }
      }
      &::after {
        display: none;
      }
    }

    .ant-menu-submenu:hover {
      .ant-menu-submenu-title {
        color: var(--primary-color);

        .ant-menu-item-icon {
          color: var(--primary-color);
        }
        .ant-menu-submenu-arrow {
          color: var(--primary-color);
        }
      }
    }

    .user-sidebar-menu-active,
    .ant-menu-submenu-selected,
    .ant-menu-item-selected {
      color: var(--primary-color);
      background-color: transparent !important;

      .ant-menu-item-icon {
        color: var(--primary-color);
      }
    }

    .ant-menu-sub.ant-menu-inline {
      background-color: transparent;
    }

    .ant-menu-item-group {
      .ant-menu-item-group-title {
        line-height: 34px;
        margin-bottom: 4px;
        padding-right: 20px;
      }
    }

    .ant-menu-title-content a {
      color: inherit;
      font-size: 15px;
    }
  }

  .kb-menu {
    height: unset !important;
    padding-left: 20px !important;
    padding-right: 20px !important;
    margin: 9px 0 !important;
  }
}

.kb-menu-wrap {
  padding: 7px 12px;
  background: #ffffff;
  border-radius: 4px;

  .kb-title-wrap {
    display: flex;
    align-items: center;
    font-size: 14px;
    font-weight: 500;
    color: #030a1a;
    line-height: 20px;

    display: flex;
    justify-content: space-between;
    align-items: center;

    .kb-icon {
      width: 16px;
      height: 16px;
    }
  }
  &:hover {
    .kb-title-wrap {
      color: var(--primary-color);
    }
  }

  .kb-desc {
    margin-top: 4px;
    font-size: 12px;
    font-weight: 400;
    color: #858c99;
    line-height: 12px;
  }
}

.my-kb-label {
  padding-left: 12px;
  font-size: 13px;
  font-weight: 400;
  color: #000000;
  line-height: 18px;
  display: flex;
  justify-content: space-between;

  .kb-label-count {
    color: #757a85;
  }

  &.menu-selected {
    color: var(--primary-color);
  }
}

.document-tree-menu {
  height: unset !important;
  background-color: transparent !important;

  .tree-menu-box {
    max-height: calc(100vh - 180px);
    width: 221px;
    .scroll-bar();
    overflow-x: visible;

    .tree-menu-body {
      width: 210px;
    }
  }
}

.menu {
  font-size: 14px;
  :global {
    .ant-menu-submenu-title {
      padding-right: 12px;
    }
  }
  .wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .plus-icon {
      padding: 4px;
      border-radius: 2px;
      color: #666;
      width: 24px;
      height: 24px;

      &:hover {
        background-color: #ddd;
      }
    }
  }
}
</style>
