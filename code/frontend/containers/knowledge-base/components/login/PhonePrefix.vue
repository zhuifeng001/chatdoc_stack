<template>
  <a-select
    class="phone-prefix-select"
    optionLabelProp="label"
    :dropdownMatchSelectWidth="245"
    :open="open"
    notFoundContent="无数据"
    @dropdownVisibleChange="dropdownVisibleChange"
  >
    <template #dropdownRender="{ menuNode: menu }">
      <div style="margin: 8px 12px" @mouseenter="enterInput = true" @mouseleave="enterInput = false">
        <a-input placeholder="请输入" v-model:value="keyword" @change="onSearch" allowClear>
          <template #prefix>
            <Search :class="$style['search-icon']" alt="搜索" />
          </template>
        </a-input>
      </div>
      <v-nodes :vnodes="menu" />
    </template>
    <a-select-option
      :key="op.name + op.dial_code + op.code"
      :value="op.value"
      :label="op.dial_code"
      v-for="op in options"
      :class="$style['option-item']"
    >
      <span>{{ op.name }}</span>
      <span :class="$style['option-code']">{{ op.dial_code }}</span>
    </a-select-option>
  </a-select>
</template>
<script lang="ts">
import { defineComponent, ref } from 'vue'
import { LoadingOutlined } from '@ant-design/icons-vue'
import type { Filter } from '@icon-park/vue-next'
import Search from '@/containers/knowledge-base/images/search.vue'
import { phonePrefix } from '../../utils/phone-prefix'

const list = phonePrefix.map(item => ({ ...item, value: item.dial_code.replace(/^\+/, '') }))

export default defineComponent({
  components: {
    Search,
    LoadingOutlined,
    VNodes: (_, { attrs }) => {
      return attrs.vnodes
    }
  },
  setup() {
    const options = ref(list)
    const keyword = ref()
    const open = ref(false)
    const enterInput = ref()

    const onSearch = useDebounceFn(e => {
      const value = e.target.value?.toLowerCase()
      options.value = list.filter(
        item =>
          item.name.toLowerCase().includes(value) ||
          item.dial_code.toLowerCase().includes(value) ||
          item.code.toLowerCase().includes(value)
      )
    }, 300)

    const dropdownVisibleChange = (isOpen, ...rest) => {
      if (!enterInput.value) {
        open.value = isOpen
      }
    }

    return {
      options,
      keyword,
      open,
      dropdownVisibleChange,
      onSearch,
      enterInput
    }
  }
})
</script>
<style lang="less" module>
.phone-prefix-select {
  :global {
    .ant-select-selector {
      border-color: transparent !important;
    }
  }
}
.search-icon {
  width: 16px;
  color: var(--text-gray-color);
}
.option-code {
  padding-left: 8px;
  color: #757a85;
}
.option-item {
  :global {
    .ant-select-item-option-content {
      white-space: wrap;
    }
  }
}
</style>
<style lang="less">
.ant-form-item-has-error .phone-prefix-select.ant-select:not(.ant-select-disabled):not(.ant-select-customize-input) {
  .ant-select-selector {
    background-color: #fff;
    border-color: transparent !important;
  }
}
</style>
