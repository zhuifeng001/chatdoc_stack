<template>
  <!-- <a-skeleton active :loading="detailLoading"> -->
  <div :class="[$style['source-wrap'], 'pb-3', item.sourceFiles?.length ? '' : $style['no-source']]">
    <div :class="[$style['source-header'], 'pt-2 pb-3']">
      <SourceIcon :class="$style['icon']" />
      <div :class="$style['title']">
        来源{{ item.sourceFiles?.length ? `(${Math.min(20, item.sourceFiles.length)})` : '' }}
      </div>
      <!-- <ArrowDownLinear :class="$style['control']" /> -->
    </div>
    <div :class="$style['source-files']">
      <SourceFile
        v-for="(doc, i) in showMore ? files.slice(0, 20) : files?.slice(0, 6)"
        :i="i"
        :doc="doc"
        :active="previewFile?.id === doc.id"
        @click="select(doc)"
      />
    </div>
    <div v-if="files && files?.length > 6" :class="$style['source-footer']">
      <span :class="$style['more']" @click="showMore = !showMore">{{ showMore ? '收起' : '查看更多' }}</span>
    </div>
  </div>
  <!-- </a-skeleton> -->
</template>
<script lang="ts" setup>
// import ArrowDownLinear from '~/containers/global-qa/images/ArrowDownLinear.vue'
import SourceIcon from '~/containers/global-qa/images/SourceIcon.vue'
import SourceFile from './SourceFile.vue'
import type { PropType } from 'vue'
import { useGlobalQAStore, type IQA } from '../store'

const props = defineProps({
  item: {
    type: Object as PropType<IQA>,
    default: () => ({})
  },
  animation: {
    type: Boolean,
    default: true
  }
})
const { animation } = toRefs(props)
const emit = defineEmits(['select'])

const globalQAStore = useGlobalQAStore()
const { previewFile, isQADetail, detailLoading } = storeToRefs(globalQAStore)

const showMore = ref(false)

const files = ref<any[]>([])
watch(
  () => props.item.sourceFiles,
  async newValue => {
    if (!newValue?.length) return
    // 问答详情，不需要动画
    if (!animation.value) {
      files.value = newValue
      return
    }
    // 需要动画
    files.value = []
    let i = 0
    for (const f of newValue) {
      i++
      files.value.push(f)
      if (i < 6) {
        await delay(300)
      }
    }
  },
  { immediate: true }
)

const select = file => {
  emit('select', file)
}
</script>
<style lang="less" module>
.source-wrap {
  min-height: 128px;

  &.no-source {
    display: none;
  }

  .source-header {
    border-radius: 8px;
    transition: all 0.3s;

    display: flex;
    align-items: center;
    cursor: pointer;

    .icon {
      margin-right: 8px;
      width: 20px;
      height: 20px;
    }

    .title {
      flex-grow: 1;
      font-weight: 500;
      font-size: 16px;
      line-height: 24px;
    }

    .control {
      color: #959ba6;
    }
  }

  .source-files {
    display: flex;
    flex-wrap: wrap;

    & > * {
      margin-right: 10px;
      width: calc((100% - 10px) / 2);

      &:nth-of-type(2n) {
        margin-right: 0;
      }
    }
  }

  .source-footer {
    text-align: right;

    .more {
      color: #959ba6;
      cursor: pointer;
      transition: all 0.3s;
      &:hover {
        color: @primary-color;
      }
    }
  }
}
</style>
