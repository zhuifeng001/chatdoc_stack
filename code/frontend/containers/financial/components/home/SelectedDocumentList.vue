<template>
  <div v-show="selectedDocumentModalVisible" :class="$style['popover-wrapper']" @click.stop>
    <div v-show="!showMini" :class="$style['popover-icon']" @click="expand = !expand">
      <a-badge :count="selectedDocuments.length" :offset="[-5, 5]">
        <NuxtImg src="/assets/images/ic-list.png" format="webp" sizes="60px 60px" />
      </a-badge>
    </div>

    <transition name="fade">
      <div v-show="expand" :class="$style['selected-list-container']">
        <div :class="[$style['list-label']]">
          已选择
          <!-- <InfoCircleOutlined :class="$style['info-icon']" /> -->
        </div>
        <CloseOutlined :class="[$style['close']]" @click="onClose" />
        <div :class="[$style['selected-list-wrapper'], 'scroll-bar']">
          <div :class="$style['selected-list']">
            <SelectedDocumentItem v-for="item in selectedDocuments" :key="item.id" :source="item" />
          </div>
          <SelectedDocumentEmpty v-if="!selectedDocuments.length" />
        </div>
        <div :class="$style['list-footer']">
          <div>
            共 <span :class="'primary-color'">{{ selectedDocuments.length }}</span> 份报告
          </div>
          <div :class="$style['btn-wrap']">
            <span :class="[$style['reset'], 'primary-color-hover']" @click="financialStore.resetDocuments">重置</span>
            <a-button :class="$style['ask']" type="primary" @click="toAsk" :disabled="!selectedDocuments.length">
              去提问
            </a-button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
<script lang="ts" setup>
import { message } from 'ant-design-vue'
import { useFinancialStore } from '../../store'
import SelectedDocumentEmpty from './SelectedDocumentEmpty.vue'
import SelectedDocumentItem from './SelectedDocumentItem.vue'
import InfoCircleOutlined from '@/containers/knowledge-base/images/InfoCircleOutlined.vue'
import CloseOutlined from '@/containers/knowledge-base/images/CloseOutlined.vue'

const financialStore = useFinancialStore()
const { selectedDocumentModalVisible, selectedDocuments, selectedDocumentVisible: expand } = storeToRefs(financialStore)

const showMini = ref(false)
watch(expand, val => {
  if (val) {
    showMini.value = val
  } else {
    setTimeout(() => {
      showMini.value = val
    }, 330)
  }
})

const toAsk = () => {
  if (!selectedDocuments.value?.length) {
    message.warning('请先选择文档')
    return
  }

  const route = useRoute()
  const pageName = route.path.includes('financial/search') ? '搜索页' : '首页'
  track({ name: `对话列表提问`, keyword: selectedDocuments.value?.map(o => o.name).join(','), page: pageName })

  financialStore.toAsk({ ids: selectedDocuments.value?.map(o => o.id), from: 'cart' })
}
const onClose = () => {
  expand.value = false
}

onMounted(() => {
  expand.value = false
  document.body.addEventListener('click', onClose)
})
onBeforeUnmount(() => {
  document.body.removeEventListener('click', onClose)
})
</script>
<style lang="less">
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
</style>
<style lang="less" module>
.popover-wrapper {
  position: fixed;
  right: 30px;
  bottom: 30px;
  z-index: 999;
  transition: all 0.3s;

  .popover-icon {
    width: 60px;
    height: 60px;
    background: #1a66ff;
    box-shadow: 4px 8px 20px 0px rgba(21, 84, 212, 0.3);
    border-radius: 50%;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  .selected-list-container {
    position: relative;
    padding: 20px 0 20px 0;

    width: 300px;
    height: 438px;
    background: #ffffff;
    box-shadow: 0px 8px 20px 0px #ccd0d9;
    border-radius: 4px;

    .close {
      position: absolute;
      top: 20px;
      right: 20px;

      font-size: 14px;
      width: 20px;
      height: 20px;
      cursor: pointer;

      &:hover {
        color: var(--primary-color);
      }
    }
  }
  .list-label {
    margin-bottom: 12px;
    padding: 0 20px;
    font-size: 16px;
    font-weight: 500;
    color: #030a1a;
    line-height: 22px;

    display: flex;
    align-items: center;

    .info-icon {
      margin-left: 4px;
      width: 20px;
      height: 20px;
      color: #ccd0d9;
      cursor: pointer;
    }
  }
  .selected-list-wrapper {
    height: calc(100% - 82px);
    overflow-y: scroll;
    .selected-list {
      padding: 0 20px;
    }
  }
  .list-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    padding: 0 20px;
    width: 100%;
    height: 68px;
    background: #fff;

    display: flex;
    align-items: center;
    justify-content: space-between;

    .btn-wrap {
      font-size: 14px;
      font-weight: 400;
      color: #ffffff;
      line-height: 20px;
    }
    .reset {
      margin-right: 12px;
      font-size: 14px;
      font-weight: 400;
      color: #858c99;
      line-height: 20px;
    }
  }
}
</style>
