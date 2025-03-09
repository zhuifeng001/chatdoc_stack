<template>
  <div :class="[$style['folder-item-wrapper'], $style['row-' + row]]">
    <div :class="$style['folder-item-box']">
      <div :class="$style['folder-item-body']">
        <slot></slot>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
defineProps({
  row: {
    type: Number,
    required: true,
    default: 6
  }
})
</script>
<style lang="less" module>
@rows: 10;

.folder-item-wrapper {
  margin: 0 12px 12px 0;
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

  .folder-item-box {
    position: relative;
    padding-top: 100%;
    height: 0;
    .folder-item-body {
      position: absolute;
      left: 0;
      top: 0;
      right: 0;
      bottom: 0;
      & > div {
        width: 100%;
        height: 100%;
        margin: 0;
      }
    }
  }
}
</style>
