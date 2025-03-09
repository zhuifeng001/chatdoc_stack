<template>
  <div>
    <div :class="$style['document-item-dummy']">
      <a-skeleton-avatar active :class="$style['document-dummy-image']" shape="square" />
      <a-skeleton active :title="false" :paragraph="paragraph" />
    </div>
  </div>
</template>
<script lang="ts" setup>
const paragraph = { rows: 2, width: [168, 168] }
defineProps({
  row: {
    type: Number,
    default: 5
  }
})
</script>
<style lang="less" module>
.document-item-dummy {
  padding: 20px 26px 40px;
  width: calc((100% - 12px * (v-bind(row) - 1)) / v-bind(row));
  height: 288px;
  background: #ffffff;
  box-shadow: 4px 8px 20px 0px rgba(21, 84, 212, 0.3);
  border-radius: 4px;
  border: 1px solid #ffffff;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s;
}

.document-dummy-image {
  margin-bottom: 20px;
  width: 100%;

  :global {
    .ant-skeleton-avatar {
      width: 168px;
      height: 168px;
    }
  }
}
</style>
