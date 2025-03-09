<template>
  <div :class="$style['search-empty']">
    <NuxtImg
      format="webp"
      src="/assets/images/financial/SearchEmpty2.png"
      alt=""
      width="120px"
      height="120px"
      sizes="120px 120px"
    />
    <div :class="$style['search-empty-label']">暂无数据</div>
    <div :class="$style['search-empty-desc']">
      未找到“{{ searchKeyword }}”相关文档，试试重新输入 或 <a style="color: var(--primary-color)">联系知识库管理员</a>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import { useKBStore } from '../../store'

const store = useKBStore()
const { searchKeyword } = storeToRefs(store)
</script>
<style lang="less" module>
.search-empty {
  margin-top: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  &-label {
    margin: 20px 0 8px 0;
    font-size: 16px;
    font-weight: 500;
    color: #000000;
    line-height: 24px;
  }

  &-desc {
    text-align: center;
    font-size: 14px;
    font-weight: 400;
    color: #858c99;
    line-height: 20px;
  }
}
</style>
