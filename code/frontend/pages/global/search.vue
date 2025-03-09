<template>
  <PageLayout>
    <section :class="['qa-theme-light', $style['global-qa-page'], showPreview ? $style['show-preview'] : '']">
      <div id="GlobalChatLeft" :class="[$style.left]">
        <div :class="[$style['left-container'], 'scroll-bar']">
          <div :class="[$style['qa-wrapper'], 'global-qa-body']">
            <div
              :class="[
                'pb-4',
                $style['qa-item'],
                (currentQA?.id === item.id || currentQA?.contentId === item.id) && $style['qa-item-active']
              ]"
              v-for="(item, index) in qaList"
              :key="item.id"
            >
              <div class="sticky top-0 bg-white pt-6 z-50 pb-1">
                <div class="text-2xl font-semibold">{{ item.question }}</div>
              </div>
              <!-- fix: 出现答案后不展示步骤条 -->
              <QASteps v-show="item._typewriter && !chatInputting && !item.answer" ref="stepCompRef" />
              <ClientOnly>
                <SourceWrap
                  :item="item"
                  :animation="!isQADetail"
                  @select="f => globalQAStore.onSelectFileAndLocatePos(f, index)"
                />
                <AnswerWrap v-show="isQADetail ? !detailLoading : true" ref="AnswerRef" :item="item" class="z-10" />
              </ClientOnly>
            </div>

            <NewQuestion :chat-type="historyStateData ? QATypeMap.get(historyStateData?.chatType) : globalQAType" />
          </div>
        </div>
        <ChatBreak v-if="chatInputting" :class="$style['chat-break']" bottom="20px" @click="onStopChat" />
        <ResizeChunk v-show="previewFile" placement="right" modifiers=".parent.flex" />
      </div>
      <div :class="[$style.right]">
        <ClientOnly>
          <KBDocument
            v-show="showPreview"
            ref="KBDocumentRef"
            :file-id="previewFile?.id"
            :page-list="pageList"
            :imageList="thumbnailList"
            :tableContent="documentTableContent"
            :documentLoading="documentLoading"
            :catalogLoading="catalogLoading"
            :thumbnailLoading="thumbnailLoading"
            :highlightThumbnailPages="highlightThumbnailPages"
            :markOptions="{
              gap: 12,
              backgroundColor: 'rgba(255, 255, 255, 1',
              backgroundImageBorder: {
                strokeStyle: 'transparent',
                lineWidth: 1,
                fillStyle: 'white',
                shadow: {
                  shadowColor: 'rgba(0,0,0,0.08)',
                  shadowBlur: 8
                }
              }
            }"
            @init="onPageMarkInit"
            @init-full="onPageMarkInitFull"
          />
        </ClientOnly>
      </div>
    </section>
  </PageLayout>
</template>
<script setup lang="ts">
import SourceWrap from '~/containers/global-qa/components/SourceWrap.vue'
import AnswerWrap from '~/containers/global-qa/components/AnswerWrap.vue'
import KBDocument from '~/components/common/mark/Document.vue'
import { useGlobalQAStore } from '~/containers/global-qa/store'
import PageLayout from '~/containers/global-qa/components/layout/PageLayout.vue'
import NewQuestion from '~/containers/global-qa/components/NewQuestion.vue'
import ChatBreak from '~/containers/knowledge-base/components/chat/ChatBreak.vue'
import QASteps from '~/containers/global-qa/components/QASteps.vue'
import { QATypeMap } from '~/containers/global-qa/components/helper'

const globalQAStore = useGlobalQAStore()
const {
  AnswerRef,
  stepCompRef,
  KBDocumentRef,
  previewFile,
  currentQA,
  qaList,
  pageList,
  thumbnailList,
  thumbnailLoading,
  documentTableContent,
  documentLoading,
  catalogLoading,
  highlightThumbnailPages,
  chatInputting,
  isQADetail,
  detailLoading,
  historyStateData,
  globalQAType
} = storeToRefs(globalQAStore)

provide('documentInfo', previewFile)
const route = useRoute()

const showPreview = computed(() => {
  return qaList.value.length > 1 || isQADetail.value || previewFile.value
})

previewFile.value = null
globalQAStore.initQAList()

onMounted(() => {
  globalQAStore.initPage()
  if (route?.query?.question) {
    globalQAStore.globalInfer({
      question: route?.query?.question as string,
      qaType: globalQAType.value
    })
  }
})

const onPageMarkInit = ins => {
  globalQAStore.globalChatEventEmitter.emit('page-mark-init', ins)
}
const onPageMarkInitFull = ins => {
  globalQAStore.globalChatEventEmitter.emit('page-mark-init-full', ins)
}

const onStopChat = (click = true) => {
  click && track({ name: `答案停止生成`, keyword: qaList.value.at(-1)?.question || '', page: '全局问答' })
  globalQAStore.globalChatEventEmitter.emit(`chat-stop`)
}

watch(currentQA, () => {
  useIdlePromise(() => {
    document.querySelector('.global-qa-body > div:last-child')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
})

onBeforeUnmount(() => {
  globalQAStore.initQAPage()
})
</script>

<style lang="less" module>
.global-qa-page {
  display: flex;
  align-items: stretch;
  height: 100%;
  position: relative;

  .left {
    position: relative;
    margin: 0 auto;
    // flex: 1 1 100%;
    flex: 1 1 40%;
    min-width: 600px;
    // max-width: 800px;
    height: 100%;

    background: #ffffff;
    backdrop-filter: blur(29px);
    transition: all 0.5s ease-in-out;
    border-radius: 8px;

    .left-container {
      padding: 0 40px 0px;
      height: 100%;
    }

    .qa-wrapper {
      position: relative;
      padding: 0 0 120px;
      min-height: 100%;

      .qa-item {
        // padding-top: 40px;
        border-top: 1px solid rgba(0, 0, 0, 0.1);

        &.qa-item-active {
          min-height: calc(100vh - 172px);

          &:not(:nth-of-type(1)) {
            min-height: calc(100vh - 170px);
          }
        }
      }
      .qa-item:first-of-type {
        border-top: none;
      }
    }
  }
  .right {
    position: relative;
    // flex: 0 0 0;
    flex: 1 1 60%;
    overflow: auto;
    // background: #e1e4eb;
    transition: all 0.5s ease-in-out;
    border-left: 1px solid rgba(0, 0, 0, 0.1);
  }

  &.show-preview {
    .left {
      flex: 1 1 40%;
      border-radius: unset;
      transition: unset;
    }
    .right {
      flex: 1 1 60%;
      min-width: 500px;
      transition: unset;
    }
  }
}

.document-tabs {
  height: 100%;
}
</style>
