<template>
  <div class="doc-thumbnails scroll-bar">
    <a-skeleton :title="false" :paragraph="{ rows: 10 }" active :loading="thumbnailLoading">
      <div
        :class="[
          'doc-thumbnail-item',
          activePage === i ? 'active' : '',
          highlightThumbnailPages?.length && highlightThumbnailPages.includes(i) ? 'highlight-thumbnail' : ''
        ]"
        v-for="(value, i) in imageList"
        :key="i"
        @click="onActiveItem(i)"
        :data-image-index="i"
      >
        <div class="doc-thumbnail-item-highlight" title="此页有高亮区域"></div>
        <div class="doc-thumbnail-item-num">{{ i + 1 }}</div>
        <img class="doc-thumbnail-item-img" loading="lazy" alt="" />
      </div>
    </a-skeleton>
  </div>
</template>
<script lang="ts" setup>
import { useInject } from '@/hooks/useInject'
import { ref, type PropType, watch, toRefs, getCurrentInstance, nextTick, onMounted } from 'vue'
// import IntersectionObserver from 'intersection-observer-polyfill'

const props = defineProps({
  imageList: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  thumbnailLoading: {
    type: Boolean,
    default: true
  },
  highlightThumbnailPages: {
    type: Array as PropType<number[]>,
    default: () => []
  }
})
const { imageList } = toRefs(props)
const vm = getCurrentInstance()?.proxy as any

const { PageMarkRef, pageIndex } = useInject(['PageMarkRef', 'pageIndex'])

// 监听是否在窗口之内
const listenViewIntoPage = (imgNode: HTMLElement) => {
  const intersectionObserver = new IntersectionObserver(entries => {
    // 如果 intersectionRatio 为 0，则目标在视野外，
    if (!entries[0].isIntersecting) return
    const target = entries[0].target as HTMLElement
    loadImage(target)
  })
  intersectionObserver.observe(imgNode)
}

const loadImage = async (target: HTMLElement) => {
  const index = Number(target.dataset.imageIndex)
  if (index == null) return
  let src = imageList.value[index]
  if (typeof src === 'function') {
    src = await src()

    // 无缓存，备用请求
    if (typeof src === 'function') {
      src = await src()
    }
  }
  // 图片加载完成后设置父级高度
  const imgNode = target.querySelector('img')
  if (imgNode) {
    imgNode.onload = () => {
      if (imgNode.parentElement) {
        imgNode.parentElement.style.height = (100 / imgNode.naturalWidth) * imgNode.naturalHeight + 'px'
      }
    }
    if (typeof src === 'object' && src instanceof Blob) {
      src = URL.createObjectURL(src)
    }
    imgNode?.setAttribute('src', src)
  }
}

const activePage = ref<any>()
const onActiveItem = (i, click = true) => {
  activePage.value = i

  const container = vm.$el
  const node = container?.querySelector?.(`[data-image-index="${i}"]`) as HTMLElement
  if (node) {
    container.scrollTo({
      top: node.offsetTop + node.clientHeight / 2 - container.clientHeight / 2
      // behavior: 'smooth' // 切换到最后一页，图片懒加载会有问题
    })
  }

  if (!click) return
  if (pageIndex.value === i + 1) return
  focusPageMarkPage(i + 1)
}

const focusPageMarkPage = (page: number) => {
  PageMarkRef.value.getMarkInstance()?.changePage(page)
}

watch(pageIndex, () => {
  if (activePage.value === pageIndex.value - 1) return
  onActiveItem(pageIndex.value - 1, false)
})

watch(
  [() => props.thumbnailLoading, imageList],
  async () => {
    if (imageList.value.length && !props.thumbnailLoading) {
      await nextTick()
      onActiveItem(pageIndex.value - 1, false)
      // 增加懒加载监听
      for (let i = 0; i < imageList.value.length; i++) {
        const node = vm.$el?.querySelector?.(`[data-image-index="${i}"]`) as HTMLElement
        listenViewIntoPage(node)
      }
    }
  },
  { immediate: true }
)
</script>
<style lang="less" scoped>
.doc-thumbnails {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;

  padding: 24px 0 12px 0;
  text-align: center;
  background: #ccd0d9;

  :deep(.ant-skeleton-paragraph) {
    text-align: center;
    li {
      width: 100px !important;
      height: 140px;
      border-radius: 0;
      display: inline-block;
    }
  }

  .doc-thumbnail-item {
    position: relative;
    margin-bottom: 12px;
    width: 100px;
    height: 140px;
    cursor: pointer;
    display: inline-block;
    border-radius: 2px;
    border: 1px solid #959ba6;
    user-select: none;

    &::before {
      content: ' ';
      position: absolute;
      left: -3px;
      top: -3px;
      width: 104px;
      height: calc(100% + 6px);
      border: 2px solid transparent;
      border-radius: 2px;
    }

    &.highlight-thumbnail {
      // background-color: rgba(72, 119, 255, 0.2);

      .doc-thumbnail-item-highlight {
        position: absolute;
        width: 10px;
        height: 10px;
        right: 2px;
        top: 2px;
        border-radius: 50%;
        background-color: rgba(72, 119, 255, 0.8);
      }
    }

    &.active {
      border-color: var(--primary-color);

      &.doc-thumbnail-item::before {
        border-color: rgba(26, 102, 255, 0.2);
      }
    }

    &-img {
      width: 100%;
      height: 100%;
    }

    &-num {
      position: absolute;
      left: 0;
      top: 0;
      z-index: 1;
      width: 16px;
      height: 16px;
      border-radius: 1px 0px 2px 0px;

      display: flex;
      align-items: center;
      justify-content: center;

      background: #e1e4eb;
      font-size: 12px;
      font-weight: 600;
      color: #757a85;
      line-height: 16px;

      &.active {
        background: var(--primary-color);
        color: #fff;
      }
    }
  }
}
</style>
