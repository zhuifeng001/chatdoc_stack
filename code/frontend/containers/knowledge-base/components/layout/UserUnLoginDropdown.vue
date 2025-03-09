<template>
  <div :class="$style['dropdown-un-login']">
    <div :class="$style['header-line']">
      <span>登录后您可享受以下权益：</span>
      <Close @click.stop="$emit('close')" />
    </div>
    <div :class="$style['content-line']">
      <ClockRecordOutlined />
      <span>自动保存使用记录</span>
    </div>
    <div :class="$style['content-line']">
      <ClockPageOutlined />
      <span>调用知识库海量资源</span>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { Close } from '@icon-park/vue-next'
import ClockRecordOutlined from '../../images/ClockRecordOutlined.vue'
import ClockPageOutlined from '../../images/ClockPageOutlined.vue'
</script>
<style lang="less" module>
.dropdown-un-login {
  margin-top: 4px;
  padding: 20px 20px 4px 20px;
  width: 300px;
  background: #ffffff;
  box-shadow: 0px 6px 18px 0px rgba(3, 10, 26, 0.12);
  border-radius: 8px;
  .header-line {
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;

    font-size: 14px;
    font-weight: 500;
    color: #000000;
    line-height: 20px;

    :global {
      .i-icon {
        padding: 6px;
        cursor: pointer;

        &:hover {
          background: #f2f4f7;
          border-radius: 4px;
        }
      }
    }
  }

  .content-line {
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    font-size: 14px;
    font-weight: 400;
    color: #757a85;
    line-height: 20px;

    svg {
      margin-right: 8px;
      width: 20px;
      height: 20px;
    }
  }
}
</style>
