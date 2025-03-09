<template>
  <Teleport to="body">
    <div :class="[$style['batch-modal'], checkedDocumentByPage?.length ? $style['visible'] : '']">
      <div :class="$style['selected-wrapper']">
        <CheckCircleOutlined :class="$style['checked-symbol']" />
        <span>
          已{{ isAllCheckedByPage ? '全选' : '选择' }}本页
          <span class="theme-color">{{ checkedDocumentByPage.length }}</span> 份报告
        </span>
      </div>
      <a-button size="small" type="link" :class="$style.cancel" @click="financialStore.onCancel">取消选择</a-button>
      <a-button size="small" :class="$style.join" ghost @click="batchAddDocuments">加入对话列表</a-button>
      <a-button size="small" :class="$style.ask" @click="toAsk">去提问</a-button>
    </div>
  </Teleport>
</template>
<script lang="ts" setup>
import { notification } from 'ant-design-vue'
import { computed, ref, toRefs, watch } from 'vue'
import { useFinancialStore } from '../../store'
import CheckCircleOutlined from '../../images/CheckCircleOutlined.vue'
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'

const emit = defineEmits(['cancel', 'check-all', 'success'])
const financialStore = useFinancialStore()
const { currentListByPage, selectedDocumentVisible } = storeToRefs(financialStore)
// 本页选中的文档
const checkedDocumentByPage = computed(() => {
  return currentListByPage.value.filter(o => o._checked)
})
// 本页是否全选
const isAllCheckedByPage = computed(() => checkedDocumentByPage.value.length === currentListByPage.value.length)

const toAsk = () => {
  const route = useRoute()
  const pageName = route.path.includes('financial/search') ? '搜索页' : '首页'

  const ids = checkedDocumentByPage.value.map(o => o.id)
  if (ids?.length > 20) {
    notification.open({
      message: `友情提示`,
      description: `最多只能提问20个文档`,
      placement: 'topRight',
      icon: () => h(ExclamationCircleOutlined, { style: 'color: orange' }),
      duration: 1.5
    })
    return
  }

  track({ name: `多选提问`, keyword: checkedDocumentByPage.value?.map(o => o.name).join(','), page: pageName })

  financialStore.toAsk({ ids: checkedDocumentByPage.value.map(o => o.id) })
}

const indeterminate = computed(
  () => !!(checkedDocumentByPage.value.length && checkedDocumentByPage.value.length < currentListByPage.value.length)
)
watch([currentListByPage, checkedDocumentByPage, () => checkedDocumentByPage.value.length], () => {
  if (checkedDocumentByPage.value.length > 0 && currentListByPage.value.length === checkedDocumentByPage.value.length) {
    checkedAll.value = true
  } else {
    checkedAll.value = false
  }
})
const checkedAll = ref(true)
const onCheckedChange = e => {
  emit('check-all', e.target.checked)
}

const batchAddDocuments = () => {
  const route = useRoute()
  const pageName = route.path.includes('financial/search') ? '搜索页' : '首页'
  track({ name: `${pageName}-多选加入列表`, keyword: checkedDocumentByPage.value?.map(o => o.name).join(',') })

  financialStore.batchAddDocuments(checkedDocumentByPage.value)
  currentListByPage.value.forEach(o => {
    o._checked = false
  })
  setTimeout(() => {
    selectedDocumentVisible.value = true
  }, 30)
}
</script>
<style lang="less" module>
.batch-modal {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translate(-50%, 100%);
  z-index: 11;

  padding: 14px 20px;
  color: #fff;
  background: var(--primary-color);
  box-shadow: 0px 6px 18px 0px rgba(3, 10, 26, 0.12);
  border-radius: 4px;

  visibility: hidden;
  opacity: 0;
  transition: all 0.3s;

  display: flex;
  align-items: center;

  :global {
    .ant-btn {
      font-size: 13px;
    }
  }

  .cancel {
    height: 28px;
    line-height: 26px;
    color: #ddd;
    background: transparent !important;

    &:hover {
      color: #fff;
    }
  }

  .join {
    opacity: 0.9;
    padding: 0 10px;
    height: 26px;
    line-height: 24px;
    &:hover {
      color: #fff;
      border-color: #fff;
      opacity: 1;
    }
  }

  .ask {
    border-color: var(--primary-color);
    margin-left: 8px;
    padding: 0 10px;
    height: 28px;
    line-height: 26px;
  }

  &.visible {
    visibility: visible;
    opacity: 1;
    bottom: 82px;
    transform: translate(-50%, 0);
  }

  .selected-wrapper {
    margin-right: 106px;
    display: flex;
    align-items: center;
  }

  .checked-symbol {
    margin-right: 6px;
    width: 24px;
    height: 24px;
    color: #fff;
  }
}
</style>
