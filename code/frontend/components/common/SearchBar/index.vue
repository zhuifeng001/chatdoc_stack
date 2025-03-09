<template>
  <a-form class="w-100 search-bar" v-bind="formAttrs" ref="form">
    <a-row :gutter="row.gutter || 25" v-bind="row">
      <slot />
    </a-row>
    <slot name="extension" />
  </a-form>
</template>
<script lang="ts" setup>
/**
 * 搜索栏
 * https://tianxuan.intsig.com/ui/component/SearchBar/
 */

import { reactive, ref, useAttrs } from "vue";
import { propsSearchBar } from "./prop";

defineProps(propsSearchBar);

defineOptions({ name: "TxSearchBar" });

const attrs = useAttrs();

const defaultFormAttrs = {
  labelAlign: "left",
  layout: "inline",
  labelCol: { span: 6 },
  wrapperCol: { span: 18 },
};
const formAttrs = reactive({
  ...defaultFormAttrs,
  ...attrs,
});
const form = ref();

defineExpose({
  form,
});
</script>
<style lang="less" src="./style.less"></style>
