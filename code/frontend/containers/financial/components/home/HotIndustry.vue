<template>
  <div :class="$style['hot-industry']">
    <!-- <div :class="$style.label">热门行业</div>
    <div :class="$style['label-opr']" v-if="data.length > 4">换一组</div>
    <div :class="$style.wrapper">
      <div v-for="item in data" :key="item.value" :class="$style.item">
        <div :class="$style['item-name']">{{ item.name }}</div>
        <div :class="$style['item-img']">
          <img :src="getPublicImage(item.cover)" />
        </div>
        <div :class="$style['item-bg-2']"></div>
        <div :class="$style['item-bg-1']"></div>
      </div>
    </div> -->
  </div>
</template>
<script lang="ts" setup>
import { useFinancialStore } from '../../store'

const financialStore = useFinancialStore()
const { hotIndustriesData } = storeToRefs(financialStore)
const data = ref(hotIndustriesData.value.slice(0, 4))
</script>
<style lang="less" module>
.hot-industry {
  position: relative;
  width: 100%;
  height: 100%;

  .label {
    margin-bottom: 23px;
    font-size: 18px;
    font-weight: 500;
    color: #000000;
    line-height: 24px;
  }

  .label-opr {
    position: absolute;
    right: 0;
    top: 3px;
    font-size: 14px;
    font-weight: 400;
    color: #757a85;
    line-height: 20px;
    cursor: pointer;
    &:hover {
      color: var(--primary-color);
    }
  }

  .wrapper {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-wrap: wrap;

    .item {
      margin-right: 12px;
      position: relative;
      cursor: pointer;

      &:nth-of-type(4n) {
        margin-right: 0;
      }

      .item-name {
        position: absolute;
        left: 20px;
        bottom: 20px;
        font-size: 16px;
        font-weight: 500;
        color: #ffffff;
        line-height: 21px;
        text-shadow: 8px 8px 120px rgba(61, 92, 153, 0.3);
      }

      .item-img {
        width: 281px;
        height: 107px;
        background: linear-gradient(138deg, #e5eaf2 0%, #f5f8fc 100%);
        box-shadow: 0px 4px 12px 0px #ccd0d9;
        border-radius: 4px;
        border-image: linear-gradient(270deg, rgba(255, 255, 255, 1), rgba(255, 255, 255, 1)) 1 1;

        img {
          width: 100%;
          height: 100%;
          border-radius: 4px;
          object-fit: cover;
        }
      }

      .item-bg-1 {
        position: absolute;
        top: -5px;
        left: 6px;
        z-index: -1;
        width: 269px;
        height: 107px;
        background: rgba(11, 45, 115, 0.1);
        border-radius: 4px;
        backdrop-filter: blur(2px);
      }
      .item-bg-2 {
        position: absolute;
        top: -10px;
        left: 14px;
        z-index: -1;
        width: 253px;
        height: 104px;
        background: rgba(11, 45, 115, 0.05);
        border-radius: 4px;
      }
    }
  }
}
</style>
