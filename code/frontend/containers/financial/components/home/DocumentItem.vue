<template>
  <div :class="$style['document-item']" :title="showTitle" @mousemove="onMousemove" @mouseleave="onMouseleave">
    <a-checkbox :class="$style['document-item-checkbox']" v-model:checked="source._checked" @click.stop />
    <ClientOnly>
      <img
        v-if="extraData.cover"
        :class="$style['document-img']"
        :src="getDocumentImage(extraData.cover)"
        @click="toAsk"
      />
      <NuxtImg
        v-else
        :class="$style['document-img']"
        src="/assets/images/FileDocumentFilled.svg"
        sizes="168px 228px"
        format="webp"
        @click="toAsk"
      />
    </ClientOnly>
    <div :class="$style['document-info']" @click="toAsk">
      <div :class="$style['document-name']">
        <div :class="$style['name-title']">{{ showTitle }}</div>
        <!-- <div>{{ extraData.stockSymbol }}</div> -->
      </div>
      <div :class="$style['document-extra']">
        <ClockCircleOutlined />
        <span>{{ formatDate(extraData.financeDate, 'YYYY/MM/DD') }}</span>
        <CopyOutlined />
        <span>{{ extraData.pageNumber || 1 }} 页</span>
      </div>
      <div :class="$style['document-btn']">
        <!-- <a-button :class="$style['document-add']" @click="financialStore.addDocument(source)">
          <CircleOutlined />
          <span>加入对话列表</span>
        </a-button> -->
        <a-button :class="[$style['document-infer'], $style['document-infer-focus']]" type="primary">
          <MessageOutlined />
          <span>立即提问</span>
        </a-button>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import CircleOutlined from '../../images/CirclePlus.vue'
import MessageOutlined from '../../images/MessageOutlined.vue'
import ClockCircleOutlined from '../../images/ClockCircleOutlined.vue'
import CopyOutlined from '../../images/CopyOutlined.vue'
import { useFinancialStore } from '../../store'
import { getDocumentImage } from '~/api'
import { formatDate } from '~/utils/date'
import dayjs from 'dayjs'

const financialStore = useFinancialStore()
const { reportTypesData } = storeToRefs(financialStore)

const props = defineProps({
  source: {
    type: Object,
    default: () => ({})
  }
})

const extraData = props.source?.extraData || {}

const showTitle = computed(() => {
  return props.source?.name
  // const { company, financeDate, financeType } = extraData
  // const year = financeDate ? dayjs(financeDate).format('YYYY年') : ''
  // const type =
  //   financeType && reportTypesData.value
  //     ? reportTypesData.value.find(item => item.value === financeType)?.name || ''
  //     : ''
  // return extraData.company ? company + year + type : props.source.name
})

const toAsk = () => {
  const route = useRoute()
  const pageName = route.path.includes('financial/search') ? '搜索页' : '首页'
  track({ name: `立即提问`, keyword: showTitle.value, page: pageName })
  financialStore.toAsk({ ids: [props.source.id] })
}

const vm = getCurrentInstance()?.proxy as any
let currentDom = null as HTMLElement | null

const xRange = [-4, 4]
const yRange = [-4, 4]
const rx = ref('0deg')
const ry = ref('0deg')
const getRotateDeg = (range, value, length) => {
  return (value / length) * (range[1] - range[0]) + range[0]
}
const onMousemove = e => {
  if (!currentDom) return
  const { clientX, clientY } = e
  const { top, left, width, height } = currentDom.getBoundingClientRect()
  const offsetX = clientX - left
  const offsetY = clientY - top
  ry.value = -getRotateDeg(yRange, offsetX, width) + 'deg'
  rx.value = getRotateDeg(xRange, offsetY, height) + 'deg'
}

const onMouseleave = () => {
  rx.value = '0deg'
  ry.value = '0deg'
}

onMounted(() => {
  currentDom = vm.$el
})
</script>
<style lang="less" module>
.document-item {
  position: relative;
  margin-right: 12px;
  margin-bottom: 12px;
  padding: 20px 26px 40px;
  // width: 222px;
  // height: 288px;
  min-height: 288px;
  background: #ffffff;
  box-shadow: 4px 8px 20px 0px rgba(21, 84, 212, 0.3);
  border-radius: 4px;
  border: 1px solid #ffffff;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.2s;

  // &:nth-of-type(5n) {
  //   margin-right: 0;
  // }

  img {
    width: 100%;
  }

  .document-item-checkbox {
    position: absolute;
    left: 0;
    top: 0;
    font-size: 0;

    :global {
      .ant-checkbox {
        top: 0px;
        left: 0px;
        width: 18px;
        height: 18px;

        &.ant-checkbox-checked::after,
        .ant-checkbox-inner {
          border-radius: 4px 0px 4px 0px;
        }

        .ant-checkbox-inner {
          width: 100%;
          height: 100%;
          background: linear-gradient(138deg, #e5eaf2 0%, #f5f8fc 100%);
          border-color: #a9c6ff !important;
        }

        &:hover {
          .ant-checkbox-inner {
            border-color: var(--primary-color) !important;
          }
        }

        &.ant-checkbox-checked {
          .ant-checkbox-inner {
            background: linear-gradient(360deg, #6699ff 0%, #1a66ff 100%);
            border: 0;
            &::after {
              background-color: transparent;
              top: 45%;
              left: 23%;
              width: 6px;
              height: 12px;
            }
          }
        }
      }

      .ant-checkbox-checked::after {
        border-color: transparent !important;
      }
    }
  }

  .document-info {
    position: absolute;
    bottom: 0;
    left: 0;
    padding: 16px 0 0;
    width: 100%;
    max-height: 164px;
    // min-height: 144px;
    background: linear-gradient(180deg, rgba(242, 244, 247, 0.9) 0%, #ffffff 100%);
    box-shadow: 0px -4px 12px 0px rgba(11, 45, 115, 0.2);
    border-radius: 0px 0px 4px 4px;
    backdrop-filter: blur(8px);
    transition: height 0.3s;
    overflow: hidden;

    .document-name {
      padding: 0 16px;
      font-size: 16px;
      font-weight: 500;
      color: #000000;
      line-height: 22px;
      // white-space: nowrap;
      word-break: break-all;
      .name-title {
        max-height: 22px * 2;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        word-break: break-all;
      }
    }
    .document-stock {
      font-size: 16px;
      font-weight: 500;
      color: #000000;
      line-height: 22px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .document-extra {
      padding: 0 16px;
      margin-top: 8px;
      margin-bottom: 12px;
      font-size: 12px;
      font-weight: 400;
      color: #757a85;
      line-height: 16px;
      display: flex;
      align-items: center;

      svg {
        margin-right: 8px;
        margin-left: 12px;
        &:first-child {
          margin-left: 0;
        }
      }
    }

    .document-btn {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      font-size: 0;
      font-weight: 400;
      line-height: 16px;

      .document-add,
      .document-infer {
        margin: 0 20px 12px 0;
        padding: 0 7px;
        border-radius: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff !important;
        border-radius: 4px;
        border: 1px solid #e1e4eb !important;
        transition: all 0.2s;

        span {
          margin-left: 4px;
          font-size: 12px;
          display: none;
        }
        svg {
          width: 16px;
          height: 16px;
        }
      }
      .document-add {
        margin-right: 8px;
        color: #000000;
      }
      .document-infer {
        color: #ffffff;
        svg {
          position: relative;
          top: 1px;
          color: #959ba6;
        }
      }
    }
  }

  &:hover {
    transform: perspective(500px) rotateX(v-bind(rx)) rotateY(v-bind(ry));

    .document-img {
      width: 100%;
      transform: scale(1.05);
      transition: all 0.3s;
    }

    .document-info {
      // padding: 0 0 0;
      // height: 32px;
      overflow: visible;

      .document-name,
      .document-extra {
        // display: none;
      }

      .document-btn {
        .document-add,
        .document-infer {
          width: 100%;
          margin: 0;
          border-radius: 0;
          border-color: transparent !important;
          span {
            display: inline;
          }
        }

        .document-infer-focus {
          background: var(--primary-color) !important;
          border-color: var(--primary-color) !important;
          svg {
            color: #fff;
          }
        }
      }
    }
  }
}
</style>
