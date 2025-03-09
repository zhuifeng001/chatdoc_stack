<template>
  <div :class="[$style['document-list']]">
    <DocumentItem
      :class="[$style['document-item'], $style['row-' + row]]"
      v-for="source in list"
      :key="source.id"
      :source="source"
    />
  </div>
</template>
<script lang="ts" setup>
import DocumentItem from './DocumentItem.vue'
defineProps({
  list: { type: Array as PropType<any[]>, default: () => [] },
  row: { type: Number, default: 5 }
})
</script>
<style lang="less" module>
.document-list {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;

  .document-item {
    width: calc((100% - 12px * (v-bind(row) - 1)) / v-bind(row));

    // 定义循环函数
    .loop(@index) when (@index <= 10) {
      // 选择第 @index n 的元素
      &:nth-of-type(@{index}n) {
        // 生成 row-x 类名
        &.row-@{index} {
          margin-right: 0;
        }
      }

      // 递归调用，继续下一个 row
      .loop(@index + 1);
    }

    // 开始循环
    .loop(1);
  }
}
</style>
