<template>
  <div :class="[$style['qa-step'], 'my-3 pt-4 pb-2 rounded bg-gray-100']">
    <!-- progress-dot -->
    <a-steps :current="current" :items="items" label-placement="vertical" size="small" />
  </div>
</template>
<script lang="ts" setup>
import { Loading3QuartersOutlined } from '@ant-design/icons-vue'
import { CheckOne } from '@icon-park/vue-next'
import type { StepProps } from 'ant-design-vue'

const current = ref<number>(0)
const vNodeProps = {
  style: { fontSize: '22px' }
}
const getLoadingVNode = () => h(Loading3QuartersOutlined, { ...vNodeProps, spin: true })
const getSuccessVNode = () => h(CheckOne, { style: { fontSize: '24px' } })
const items = ref([
  {
    title: '问题分析'
  },
  {
    title: '知识库检索'
  },
  {
    title: '整理答案'
  },
  {
    title: '完成'
  }
] as StepProps[])

const JumpToStep1 = async () => {
  items.value = [
    {
      title: '问题分析',
      icon: getLoadingVNode()
    },
    {
      title: '知识库检索'
    },
    {
      title: '整理答案'
    },
    {
      title: '完成'
    }
  ]
  await nextTick()
  current.value = 0
}

const JumpToStep2 = async () => {
  items.value = [
    {
      title: '问题分析',
      icon: getSuccessVNode()
    },
    {
      title: '知识库检索',
      icon: getLoadingVNode()
    },
    {
      title: '整理答案'
    },
    {
      title: '完成'
    }
  ]
  await nextTick()
  current.value = 1
}

const JumpToStep3 = async () => {
  items.value = [
    {
      title: '问题分析',
      icon: getSuccessVNode()
    },
    {
      title: '知识库检索',
      icon: getSuccessVNode()
    },
    {
      title: '整理答案',
      icon: getLoadingVNode()
    },
    {
      title: '完成'
    }
  ]
  await nextTick()
  current.value = 2
}

const JumpToStep4 = async () => {
  items.value = [
    {
      title: '问题分析',
      icon: getSuccessVNode()
    },
    {
      title: '知识库检索',
      icon: getSuccessVNode()
    },
    {
      title: '整理答案',
      icon: getSuccessVNode()
    },
    {
      title: '完成',
      icon: getSuccessVNode()
    }
  ]
  await nextTick()
  current.value = 3
}

const jumpToStep = (step: number) => {
  switch (step) {
    case 0:
      JumpToStep1()
      break
    case 1:
      JumpToStep2()
      break
    case 2:
      JumpToStep3()
      break
    case 3:
      JumpToStep4()
      break
  }
}

defineExpose({
  jumpToStep
})
</script>
<style lang="less" module>
.qa-step {
  :global {
    .ant-steps .ant-steps-item-custom > .ant-steps-item-container > .ant-steps-item-icon {
      width: 24px;
      height: 24px;

      .ant-steps-icon {
        margin-left: -4px;
        margin-top: -4px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  }
}
</style>
