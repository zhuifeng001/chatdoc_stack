<template>
  <div class="page-mark-menu">
    <div class="page-mark-menu-header">
      <a-tooltip
        placement="bottom"
        overlayClassName="acg-tooltip"
        :title="
          menuVisible
            ? menuState === MenuState.TABLE
              ? '收起目录'
              : '收起缩略图'
            : menuState === MenuState.TABLE
            ? '展开目录'
            : '展开缩略图'
        "
      >
        <div :class="['menu-left-wrapper']" @click="emit('update:menu-visible', !menuVisible)">
          <FileDocumentFilled :class="['page-mark-document-icon']" />
          <span class="page-mark-menu-title">目录</span>
        </div>
      </a-tooltip>
      <div :class="['menu-right-wrapper', menuVisible ? 'menu-icon-visible' : 'menu-icon-hidden']">
        <a-divider type="vertical" style="height: 20px; background-color: #e1e4eb" />
        <a-tooltip placement="bottom" overlayClassName="acg-tooltip" title="目录">
          <div
            class="menu-icon-wrapper"
            :class="{ active: menuState === MenuState.TABLE }"
            @click="emit('update:menu-state', MenuState.TABLE)"
          >
            <img class="page-mark-menu-icon" :src="MenuOutlined" alt="" />
          </div>
        </a-tooltip>
        <a-tooltip placement="bottom" overlayClassName="acg-tooltip" title="缩略图">
          <div
            class="menu-icon-wrapper"
            :class="{ active: menuState === MenuState.IMAGE }"
            @click="emit('update:menu-state', MenuState.IMAGE)"
          >
            <img class="page-mark-app-icon" :src="AppstoreOutlined" alt="" />
          </div>
        </a-tooltip>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import FileDocumentFilled from './icons/FileDocumentFilled.vue'
import AppstoreOutlined from './icons/AppstoreOutlined.svg'
import MenuOutlined from './icons/MenuOutlined.svg'
import type { PropType } from 'vue'
import { MenuState } from './helper'

defineProps({
  menuState: {
    type: String as PropType<MenuState>
  },
  menuVisible: {
    type: Boolean
  }
})
const emit = defineEmits(['update:menu-state', 'update:menu-visible'])
</script>
<style lang="less" scoped>
.page-mark-menu {
  width: 180px;
  flex-basis: 180px;
  flex-shrink: 0;
  flex-grow: 0;
  border-right: 1px solid rgba(0, 0, 0, 0.1);

  .page-mark-menu-header {
    height: 100%;
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f2f4f7;
    user-select: none;
  }

  .menu-left-wrapper {
    cursor: pointer;
  }

  .menu-left-wrapper,
  .menu-right-wrapper {
    display: flex;
    align-items: center;
  }
  .menu-right-wrapper {
    transition: all 0.3s;

    &.menu-icon-visible {
      opacity: 1;
      visibility: visible;

      .menu-left-wrapper {
        color: var(--primary-color);
      }
    }
    &.menu-icon-hidden {
      opacity: 0;
      visibility: hidden;
    }
  }

  .page-mark-menu-title {
    margin: 0 3px 0 4px;
    font-size: 14px;
    font-weight: 400;
    color: #000000;
    line-height: 20px;
  }

  .page-mark-document-icon {
    width: 20px;
    height: 20px;
    color: #b2b7c2;
  }

  .menu-icon-wrapper {
    margin-left: 5px;
    width: 24px;
    height: 24px;

    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;

    &:hover,
    &.active {
      background: #ffffff;
    }
  }

  .page-mark-menu-icon {
    width: 12px;
    height: 12px;
  }

  .page-mark-app-icon {
    width: 16px;
    height: 16px;
  }
}
</style>
