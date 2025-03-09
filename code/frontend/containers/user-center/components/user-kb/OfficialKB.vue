<template>
  <div :class="$style['official-kb-wrapper']">
    <div :class="$style['official-kb-label']">官方知识库</div>
    <div :class="$style['official-kb-item']" v-if="officialLibraryData" v-for="item in officialLibraryData">
      <div :class="$style['kb-item-name']">{{ item.name }}</div>
      <div :class="$style['kb-item-info']">{{ item.note }}</div>
    </div>
    <a-skeleton v-else :paragraph="{ rows: 2 }" />
  </div>
</template>
<script lang="ts" setup>
import { useMyLibrary } from '../../store/useMyLibrary'

const store = useMyLibrary()
const { officialLibraryData } = storeToRefs(store)
</script>
<style lang="less" module>
.official-kb-wrapper {
  :global {
    .ant-skeleton-title {
      margin-top: 2px;
    }
    .ant-skeleton-paragraph {
      margin-top: 12px;
    }
  }
}
.official-kb-label {
  margin-bottom: 20px;
  font-size: 16px;
  font-weight: bold;
  color: #030a1a;
  line-height: 24px;
}

.official-kb-item {
  padding: 20px;
  width: 100%;
  height: 104px;
  border-radius: 8px;
  background: url(~/containers/user-center/images/official-bg.png) no-repeat center right / 1140px 104px;
  background-color: #1a66ff;

  &:not(:last-child) {
    margin-bottom: 12px;
  }

  .kb-item-name {
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
    line-height: 20px;
  }

  .kb-item-info {
    max-width: 725px;
    margin-top: 4px;
    font-size: 14px;
    font-weight: 400;
    color: #ffffff;
    line-height: 20px;
  }
}
</style>
