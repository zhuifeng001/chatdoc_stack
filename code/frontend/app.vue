<template>
  <a-config-provider :locale="zh_CN" :theme="themeConfig">
    <a-extract-style>
      <a-style-provider :transformers="[legacyLogicalPropertiesTransformer]">
        <NuxtLayout>
          <NuxtPage :keepalive="keepaliveConfig" />
        </NuxtLayout>
      </a-style-provider>
    </a-extract-style>
  </a-config-provider>
</template>
<script lang="ts" setup>
useHead({
  htmlAttrs: { lang: 'zh-CN' },
  title: '知识管理助手',
  meta: [
    { name: 'viewport', content: 'width=device-width' },
    { name: 'description', content: '知识管理助手' },
    {
      name: 'description',
      content:
        '运用合合信息行业领先文档解析引擎及检索召回策略，提供专业准确的文档总结及问答能力，辅助个人知识管理及检索'
    }
  ],
  link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.png' }],
  script: [{ src: '/config.js' }],
  bodyAttrs: { class: 'scroll-bar' }
})

import zh_CN from 'ant-design-vue/es/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
dayjs.locale('zh-cn')
import { legacyLogicalPropertiesTransformer } from 'ant-design-vue'
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context'

const colorPrimary = '#1a66ff'
const keepaliveConfig = { include: ['financial', 'user-center'] }

const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: colorPrimary,
    borderRadius: 4,
    borderRadiusSM: 2
  },
  components: {
    Checkbox: {
      size: 18
    }
  }
}
</script>
