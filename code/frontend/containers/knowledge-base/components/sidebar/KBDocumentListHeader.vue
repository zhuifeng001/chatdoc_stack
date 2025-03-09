<template>
  <div :class="[$style['kb-document-list-header'], 'kb-document-selection']">
    <div :class="$style['selection-wrapper']">
      <a-checkbox
        v-if="selectedMultiple"
        :class="$style['checkbox-all']"
        :indeterminate="indeterminate"
        v-model:checked="selectedAll"
      >
        全选 ({{ checkedDocuments.length }})
      </a-checkbox>
      <span v-else>选择</span>
      <!-- <ClientOnly v-if="showSortTool">
        <a-dropdown :getPopupContainer="node => node.parentElement" :trigger="['click']">
          <RowMove />
          <template #overlay>
            <div :class="$style['sort-wrapper']">
              <div :class="[$style['sort-menu-item'], $style.disabled]">排序设置仅对当前窗口生效</div>
              <a-menu :class="$style['sort-menu']">
                <a-menu-item
                  :class="[$style['sort-menu-item'], currentSortType === 1 ? $style['sort-menu-active-item'] : '']"
                >
                  <a href="javascript:;" @click="sort(1)">按添加时间（近-远）</a>
                  <Check :class="$style['sort-item-active-icon']" theme="outline" />
                </a-menu-item>
                <a-menu-item
                  :class="[$style['sort-menu-item'], currentSortType === 2 ? $style['sort-menu-active-item'] : '']"
                >
                  <a href="javascript:;" @click="sort(2)">按报告时间（近-远）</a>
                  <Check :class="$style['sort-item-active-icon']" theme="outline" />
                </a-menu-item>
                <a-menu-item
                  :class="[$style['sort-menu-item'], currentSortType === 3 ? $style['sort-menu-active-item'] : '']"
                >
                  <a href="javascript:;" @click="sort(3)">按企业名称（A-Z） </a>
                  <Check :class="$style['sort-item-active-icon']" theme="outline" />
                </a-menu-item>
              </a-menu>
            </div>
          </template>
        </a-dropdown>
      </ClientOnly> -->
    </div>
    <div :class="[$style['control-search']]" @click="sidebarSearchVisible = !sidebarSearchVisible">
      <acg-tooltip
        overlayClassName="acg-tooltip"
        :title="sidebarSearchVisible ? '收起搜索栏' : '展开搜索栏'"
        placement="bottom"
      >
        <Up v-show="sidebarSearchVisible" size="20px" />
        <Search v-show="!sidebarSearchVisible" size="16px" />
      </acg-tooltip>
    </div>
    <!-- :indeterminate="selectedMultiple" -->
    <!-- <a-checkbox v-model:checked="selectedMultiple" @change="store.onMultipleChange($event.target.checked)">
      多选
    </a-checkbox> -->
  </div>
</template>
<script lang="ts" setup>
import { useKBStore } from '../../store'
import RowMove from '../../images/RowMove.vue'
import { Up, Down, Search } from '@icon-park/vue-next'

const store = useKBStore()
const {
  sidebarSearchVisible,
  selectedMultiple,
  selectedAll,
  indeterminate,
  showSortTool,
  fileFlatData,
  checkedDocuments
} = storeToRefs(store)

watch(
  () => checkedDocuments.value.length,
  () => {
    if (!checkedDocuments.value.length) {
      selectedAll.value = false
    } else if (fileFlatData.value.length === checkedDocuments.value.length) {
      selectedAll.value = true
    }
  }
)

const currentSortType = ref(1)

const sortMap = new Map([
  [1, store.sortByAddTime],
  [2, store.sortByFinancialTime],
  [3, store.sortByCompanyName]
])
const sort = (sortType: number) => {
  if (currentSortType.value === sortType) {
    // 默认排序
    currentSortType.value = 1
  } else {
    currentSortType.value = sortType
  }
  sortMap.get(currentSortType.value)?.()
}
</script>
<style lang="less" module>
@checkboxColor: #ababab;

.kb-document-list-header {
  .selection-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    user-select: none;

    span {
      white-space: nowrap;
    }

    svg {
      margin-left: 4px;
      width: 20px;
      height: 20px;
      cursor: pointer;

      &:hover {
        color: var(--primary-color);
      }
    }

    :global {
      .ant-checkbox-wrapper:not(.ant-checkbox-wrapper-disabled):hover
        .ant-checkbox-checked:not(.ant-checkbox-disabled)
        .ant-checkbox-inner {
        background-color: @checkboxColor !important;
        border-color: transparent;
      }
    }

    .checkbox-all {
      :global {
        .ant-checkbox {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          flex-grow: 0;

          .ant-checkbox-inner {
            width: 100%;
            height: 100%;
          }
        }

        .ant-checkbox-checked,
        .ant-checkbox-indeterminate {
          .ant-checkbox-inner {
            background-color: @checkboxColor;
            border-color: @checkboxColor;

            &::after {
              top: 46%;
            }
          }
        }

        .ant-checkbox,
        .ant-checkbox-checked {
          &:hover {
            .ant-checkbox-inner {
              border-color: #999;
            }
          }
        }

        .ant-checkbox-checked {
          &::after,
          &:hover::after {
            border-color: #999;
          }
        }

        .ant-checkbox-wrapper:hover .ant-checkbox-inner,
        .ant-checkbox:hover .ant-checkbox-inner,
        .ant-checkbox-input:focus + .ant-checkbox-inner {
          border-color: #999;
        }
      }
    }
  }
}

.control-search {
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;

  span {
    display: flex;
    align-items: center;
  }

  &:hover {
    color: var(--primary-color);
    cursor: pointer;
  }
}

.sort-wrapper {
  padding: 4px;
  width: 100%;
  background: #ffffff;
  box-shadow: 0px 6px 18px 0px rgba(3, 10, 26, 0.12);
  border-radius: 4px;

  .sort-menu {
    border-right: 0;

    :global {
      .ant-menu-item-selected {
        background: #ffffff;
      }
    }
  }
  .sort-menu-item {
    margin-top: 0;
    margin-bottom: 4px;
    padding: 5px 8px;
    line-height: 20px;
    height: 28px;

    :global {
      .ant-menu-title-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    }

    a {
      font-size: 14px;
      font-weight: 400;
      color: #000000;
    }

    .sort-item-active-icon {
      width: 16px;
      height: 16px;
      display: none !important;
    }

    &:hover:not(.disabled),
    &.sort-menu-active-item {
      background-color: #e0ebff;

      a {
        color: var(--primary-color);
      }
    }

    &.sort-menu-active-item {
      .sort-item-active-icon {
        display: inline-flex !important;
        color: #1a66ff;
      }
    }
  }
}
</style>
