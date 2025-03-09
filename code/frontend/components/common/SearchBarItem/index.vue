<template>
  <a-col :class="[last ? 'search-bar-item-last' : '']" v-bind="propsCol">
    <a-form-item class="w-100" :wrapperCol="last ? attrs.wrapperCol || { span: 24 } : attrs.wrapperCol" v-bind="attrs">
      <slot />
    </a-form-item>
  </a-col>
</template>
<script lang="ts" setup>

import { reactive, toRefs, useAttrs } from 'vue'
import { propsSearchBarItem } from './prop'

defineOptions({ name: 'TxSearchBarItem' })

const props = defineProps(propsSearchBarItem)
const attrs = useAttrs()
const { col } = toRefs(props)
const defaultCol = {
  xs: 24,
  md: 24,
  lg: 12,
  span: 8,
  xl: 8,
  xxl: 6,
  xxxl: 4
}
const propsCol = reactive(Object.keys(col.value).length ? col.value : defaultCol)
</script>
<style lang="less" src="./style.less"></style>
