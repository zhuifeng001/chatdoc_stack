<template>
  <div :class="$style['chat-guide-bar']">
    <div :class="$style['guide-location']">
      <div :class="$style['location-icon']">
        <!-- <img src="../../images/logo-financial.png" alt="" /> -->
        <NuxtImg src="/favicon_3x.png" alt="" format="webp" height="30px" />
      </div>
      <div :class="$style['location-info']">
        <div :class="$style['location-title']">{{ historyStateData?.personal ? '个人知识库' : '财经知识库' }}</div>
        <div :class="$style['location-other']">
          <span>运营方</span>
          <span style="color: var(--primary-color)">@ 合合信息</span>
        </div>
      </div>
    </div>
    <!-- <div :class="$style['guide-desc']">
      运用合合信息行业领先文档解析引擎及检索召回策略，提供专业准确的文档总结及问答能力，提升文档阅读及信息检索效率。
    </div> -->
  </div>
</template>
<script setup lang="ts">
import { useKBStore } from '../../store'

const store = useKBStore()
const { historyStateData } = storeToRefs(store)
</script>
<style lang="less" module>
.chat-guide-bar {
  padding: 12px;
  width: 100%;
  background: #e1e4eb;
  border-radius: 8px;

  .guide-location {
    display: flex;
    align-items: center;
    .location-icon {
      margin-right: 8px;
      padding: 8px;
      width: 50px;
      height: 50px;
      border-radius: 8px;
      background: #fff;

      img {
        width: 100%;
        height: 100%;
      }
    }

    .location-title {
      margin-bottom: 4px;
      font-size: 18px;
      font-weight: 600;
      color: #000000;
      line-height: 18px;
    }

    .location-other {
      font-size: 14px;
      font-weight: 400;
      color: #757a85;
      line-height: 20px;
    }
  }

  .guide-desc {
    margin-top: 12px;
    font-size: 14px;
    font-weight: 400;
    color: #000000;
    line-height: 20px;
  }
}
</style>
