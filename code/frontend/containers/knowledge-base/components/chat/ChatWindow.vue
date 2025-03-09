<template>
  <div
    :class="[$style['kb-answer-container'], 'kb-answer-container', 'scroll-bar']"
    id="KBAnswerContainer"
    @wheel="onMousewheel"
    @scroll="onScroll"
  >
    <ChatGuideBar v-if="!noHeader && selectedKBLibrary?.id === KB_FINANCIAL_ID" />
    <div :class="[$style['chat-line'], $style['chat-start']]"></div>
    <div
      v-for="(item, index) in qaList"
      :key="item.id"
      :data-id="item.id"
      :class="[$style['chat-line'], getClassName(item.type)]"
    >
      <div class="wrapper">
        <ChatGuideStart v-if="item.type === ChatQAType.START" :content="item.content" />
        <ChatAnswer
          v-else-if="item.type === ChatQAType.ANSWER"
          ref="chatAnswerRef"
          :answer="item"
          :question="qaList[index - 1]"
          :activeAnswer="activeAnswer"
          @active="v => (activeAnswer = v)"
          @finish="onAnswerFinish"
        ></ChatAnswer>
        <a-divider v-else-if="item.type === ChatQAType.DIVIDER">{{ item.content }}</a-divider>
        <ChatQuestion v-else-if="item.type === ChatQAType.QUESTION" :question="item"></ChatQuestion>
        <span v-else>{{ item.content }}</span>
      </div>
    </div>
    <!-- <div class="kb-answer-body"></div>
        <div class="kb-answer toolbar">
          <a-button @click="onExportPDF">导出PDF</a-button>
        </div> -->
    <div id="ChatDummyContainer" class="chat-dummy-container"></div>
  </div>
</template>
<script lang="ts" setup>
import { getCurrentInstance, onMounted, onBeforeUnmount, type PropType, toRefs, watch, nextTick, ref } from 'vue'
import ChatGuideBar from './ChatGuideBar.vue'
import ChatGuideStart from './ChatGuideStart.vue'
import ChatAnswer from './ChatAnswer.vue'
import ChatQuestion from './ChatQuestion.vue'
import { ChatQAType } from './helper'
import { storeToRefs } from 'pinia'
import { useTheme } from '../../store/useTheme'
import { useKBStore } from '../../store'
import { KB_FINANCIAL_ID } from '../../helper'
import { debounce } from 'lodash-es'
import { useInject } from '~/hooks/useInject'

const { fontSize } = storeToRefs(useTheme())
const { selectedKBLibrary } = storeToRefs(useKBStore())

const props = defineProps({
  qaList: {
    type: Array as PropType<any[]>,
    default: () => []
  }
})
const { noHeader } = useInject(['noHeader'])
const vm = getCurrentInstance()?.proxy as any
const { qaList } = toRefs(props)

const getClassName = (type: ChatQAType) => {
  const map = {
    [ChatQAType.START]: vm.$style['chat-start'],
    [ChatQAType.QUESTION]: vm.$style['chat-question'],
    [ChatQAType.ANSWER]: vm.$style['chat-answer'],
    [ChatQAType.DIVIDER]: vm.$style['chat-divider']
  }
  return map[type]
}

const displayLastChat = () => {
  const children = vm.$el.querySelectorAll('.' + vm.$style['chat-line'])
  const lastChild = children[children.length - 1] as HTMLElement
  vm.$el?.scrollTo({
    top: lastChild?.offsetTop + lastChild?.clientHeight,
    behavior: 'smooth'
  })
}
// 新增一个问答，设置滚动条
watch(
  () => qaList.value.map(o => o.id).join(','),
  async () => {
    await nextTick()
    displayLastChat()
  }
)

const onAnswerFinish = async () => {
  await nextTick()
  displayLastChat()
}

const chatAnswerRef = ref()
const autoScroll = ref(true)
const onMousewheel = debounce(
  () => {
    autoScroll.value = false
    chatAnswerRef.value?.forEach?.(item => {
      item?.setAutoScroll()
    })
  },
  100,
  { leading: true, trailing: false }
)
const onScroll = debounce(
  e => {
    const element = e.target
    const isBottom = element.scrollTop + element.clientHeight === element.scrollHeight
    if (isBottom && !autoScroll.value) {
      autoScroll.value = true
      chatAnswerRef.value?.[chatAnswerRef.value.length - 1]?.setAutoScroll(true)
    }
  },
  300,
  { leading: true, trailing: true }
)

const activeAnswer = ref<any>()

const table = `

前端相关API的浏览器兼容情况<br />没有列出来的说明兼容性良好，满足大部分浏览器及版本

| API | Chrome | IE | Safari | Edge | Firefox |
| --- | --- | --- | --- | --- | --- |
| ResizeObserver | 64+✅  | ❌ | 13.1+✅ | 79+✅ | 69+✅ |
| IntersectionObserver | 51+✅  | ❌ | 12.1+✅ | 15+✅ | 55+✅ |
| CSS Environment Variables | 69+✅  | ❌ | 11.1+✅ | 79+✅ | 65+✅ |
| CSS Scroll-behavior | 61+✅  | ❌ | 15.4+✅ | 79+✅ | 36+✅ |
| requestIdleCallback | 47+✅  | ❌ | ❌ | 79+✅ | 55+✅ |
| Promise.prototype.finally | 63+✅ | ❌ | 11.1+✅ | 18+✅ | 58+✅ |
| Promise: allSettled() | 76+✅ | ❌ | 13+✅ | 79+✅ | 71+✅ |
| String.prototype.matchAll | 73+✅ | ❌ | 13+✅ | 79+✅ | 67+✅ |
| Proxy Object | 49+✅ | ❌ | 10+✅ | 12+✅ | 18+✅ |
| mousewheel | 4+✅ | 9+✅ | 3.1+✅ | 12+✅ | ❌ |
| DOMMouseScroll  | ❌ | ❌ | ❌ | ❌ | 2+✅ |
| svg | 4+✅ | ❌ | 3.2+✅ | 79+✅ | 3+✅ |
| canvas | 4+✅ | 9+✅ | 4+✅ | 12+✅ | 3.6+✅ |
| WebGL - 3D Canvas | 33+✅ | ❌ | 8+✅ | 79+✅ | 24+✅ |

<a name="fxAa5"></a>
`

const code = `

\`\`\`json
{
  "name": "camscanner-mo-vue3",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "dev:online": "vite --mode online",
    "yarn": "yarn --ignore-engines",
    "build:dev": "run-p type-check build-only:dev",
    "build:test": "run-p type-check build-only:test",
    "build:online": "run-p type-check build-only:online"
  }
}
\`\`\`


\`\`\`html
<template>
  <div id="container">
    <div id="body"></div>
    <span
      v-show="cursorPosition.left"
      class="typing"
      :style="{ left: cursorPosition.left + 'px', top: cursorPosition.top + 'px', height: cursorPosition.height + 'px', width: cursorPosition.height / 4 + 'px' }"
    ></span>
  </div>
</template>
\`\`\`
`

const str = `

####

![GitHub标志](http://localhost:10001/src/components/GptHeader/images/intsig_logo.png)



# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 \`<script setup>\` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).

## Type Support For \`.vue\` Imports in TS

TypeScript cannot handle type information for \`.vue\` imports by default, so we replace the \`tsc\` CLI with \`vue-tsc\` for type checking. In editors, we need [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) to make the TypeScript language service aware of \`.vue\` types.

If the standalone TypeScript plugin doesn't feel fast enough to you, Volar has also implemented a [Take Over Mode](https://github.com/johnsoncodehk/volar/discussions/471#discussioncomment-1361669) that is more performant. You can enable it by the following steps:

1. Disable the built-in TypeScript Extension
   1. Run \`Extensions: Show Built-in Extensions\` from VSCode's command palette
   2. Find \`TypeScript and JavaScript Language Features\`, right click and select \`Disable (Workspace)\`
2. Reload the VSCode window by running \`Developer: Reload Window\` from the command palette.
`
</script>
<style lang="less" module>
.kb-answer-container {
  position: relative;
  padding: 52px 20px 0;
  width: 100%;
  height: 100%;
  flex: 1;
  transition: all 0.3s;
  overflow: auto;
  overflow-x: hidden;

  .chat-line {
    margin: 10px 0;
    display: block;

    &.chat-start,
    &.chat-question,
    &.chat-answer {
      max-width: 100%;

      > * {
        padding: 8px;
        max-width: 100%;
        display: inline-block;
        word-wrap: break-word;

        text-align: left;
        font-size: v-bind(fontSize);
        font-weight: 400;
        color: #000000;

        line-height: calc(v-bind(fontSize) + 6px);
      }
    }

    &.chat-divider {
      padding: 10px 40px 0;
      user-select: none;

      :global {
        .ant-divider {
          font-size: 14px;
          color: #999;
          // text-shadow: #aaa 0 0 1px;

          &::before,
          &::after {
            transform: translateY(10px);
          }
        }
      }
    }

    &.chat-question,
    &.chat-answer {
      > * {
        padding: 0;
      }
    }
    &.chat-start {
      margin-top: 8px;
    }

    &.chat-start,
    &.chat-answer {
      text-align: left;

      > * {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) 100%);
        box-shadow: 2px 2px 12px 0px rgba(192, 196, 204, 0.51), -2px -2px 12px 0px rgba(255, 255, 255, 0.74);
        border-radius: 0px 8px 8px 8px;
        // border: 1px solid #ffffff;
        backdrop-filter: blur(10px);
      }
    }

    &.chat-question {
      text-align: right;
      > * {
        background: var(--primary-color);
        border-radius: 8px 0px 8px 8px;
        color: #fff;
        span::selection {
          color: white;
          background: black;
        }
      }
    }
  }
}
</style>

<style lang="less">
.chat-dummy-container {
  flex-shrink: 0;
  width: 100%;
  height: 184px;
  transition: all 0.3s;
}

.kb-export-body {
  // A4 宽度
  width: calc(793.7px - 40px) !important;

  // 代码块自动换行
  pre[class*='language-'],
  code[class*='language-'] {
    white-space: pre-wrap;
  }
}

@import url(~/assets/styles/answer.less);
</style>
