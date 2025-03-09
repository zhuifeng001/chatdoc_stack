<template>
  <div :class="[$style['card-wrapper'], props.class]">
    <div :class="$style['card-header']">
      <div :class="$style['card-title']">{{ title }}</div>
      <div :class="$style['card-header-extra']">
        <slot name="extra"></slot>
        <NuxtLink :class="$style['card-header-link']" v-if="link" :to="link.href">
          <span :class="$style['header-link-text']">{{ link.title }}</span>
          <right-outlined />
        </NuxtLink>
      </div>
    </div>
    <slot></slot>
  </div>
</template>
<script lang="ts" setup>
import { RightOutlined } from '@ant-design/icons-vue'

const props = defineProps<{ title?: string; link?: { href: string; title: string }; class?: string }>()
</script>
<style lang="less" module>
.card-wrapper {
  background: #ffffff;
  box-shadow: 2px 1px 4px 0px rgba(3, 10, 26, 0.1);
  border-radius: 4px;
  padding: 20px;

  .card-header {
    display: flex;
    justify-content: space-between;
    line-height: 24px;

    .card-title {
      font-size: 16px;
      font-weight: bold;
      color: var(--text-color);
    }
    .card-header-extra {
    }
    .card-header-link {
      color: var(--text-gray-color);
      .header-link-text {
        padding-right: 4px;
      }
    }
  }
}
</style>
