<template>
  <div :class="$style['sort-wrapper']" @click="change">
    <slot></slot>
    <span :class="$style['ml-1']">
      <CaretUpFilled
        :class="[$style['pr'], status == SortStatusEnums.ASC ? $style['active'] : '']"
        style="top: -0.3em"
      />
      <CaretDownFilled
        :class="[$style['pr'], status == SortStatusEnums.DESC ? $style['active'] : '']"
        style="bottom: -0.3em; margin-left: -1em"
      />
    </span>
  </div>
</template>
<script lang="ts" setup>
import { CaretDownFilled, CaretUpFilled } from '@ant-design/icons-vue'

const props = defineProps({
  sort: {
    type: String as PropType<'ASC' | 'DESC' | ''>,
    default: ''
  }
})

const emit = defineEmits(['change', 'update:sort'])

// 组件三种状态，升序，降序，取消排序
const SortStatusEnums = {
  ASC: 'ASC',
  DESC: 'DESC',
  DEFAULT: ''
}

const status = ref(SortStatusEnums.DEFAULT)

watchEffect(() => {
  status.value = props.sort
})

const change = () => {
  // 在 ['ASC', 'DESC', 'DEFAULT'] 数组中，index + 1 循环取值
  const keys = Object.keys(SortStatusEnums)
  const currentIndex = keys.findIndex(key => status.value === SortStatusEnums[key])
  const nextKey = SortStatusEnums[keys[(currentIndex + 1) % 3]]
  status.value = nextKey
  emit('update:sort', nextKey)
  emit('change', nextKey)
}
</script>
<style lang="less" module>
.sort-wrapper {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}
.ml-1 {
  margin-left: 8px;
}
.pr {
  position: relative;
}
.active {
  color: var(--primary-color);
}
</style>
