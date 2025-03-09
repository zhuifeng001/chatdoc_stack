<template>
  <div v-show="visible" class="ant-popover page-contextmenu">
    <div class="page-menu-list">
      <div class="page-menu-item" @click="rotatePage">单页旋转</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useInject } from '@/hooks/useInject'
import { onBeforeUnmount, onMounted } from 'vue'
import { ref, toRefs, type PropType, computed, watch, nextTick, getCurrentInstance } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  position: {
    type: Array as PropType<number[]>,
    default: () => []
  },
  page: {
    type: Number,
    default: 1
  }
})
const emit = defineEmits(['update:visible'])
const { visible, position, page } = toRefs(props)

const { getMarkInstance } = useInject(['getMarkInstance'])

const rotatePage = () => {
  getMarkInstance()?.rotate(page.value)
}

const onUpdateVisible = v => {
  emit('update:visible', v)
}

const close = () => {
  onUpdateVisible(false)
}

onMounted(() => {
  document.body.addEventListener('click', close)
})

onBeforeUnmount(() => {
  document.body.removeEventListener('click', close)
})

const vm = getCurrentInstance()?.proxy as any
watch([visible, position], async () => {
  if (!visible.value) return
  await nextTick()
  const wrapper = vm.$el

  wrapper.style.setProperty('--left', `${position.value[0]}px`)
  wrapper.style.setProperty('--top', `${position.value[1]}px`)

  wrapper.oncontextmenu = e => {
    e.preventDefault()
    e.stopPropagation()
  }
})
const x = ref(0)
</script>
<style lang="less" scoped>
.page-contextmenu {
  position: fixed !important;
  left: var(--left) !important;
  top: var(--top) !important;

  overflow: visible;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.117647), 0 1px 4px rgba(0, 0, 0, 0.117647);
  transform-origin: center top;

  background-color: #ffffff;
  border-radius: 4px;

  .page-menu-list {
    width: 150px;
    padding: 8px;

    .page-menu-item {
      padding: 4px 8px;
      position: relative;
      display: -webkit-box;
      display: -webkit-flex;
      display: -ms-flexbox;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 4px;
      cursor: pointer;
      user-select: none;

      &:hover {
        background-color: rgba(242, 244, 247, 1);
      }
    }
  }
}
</style>
