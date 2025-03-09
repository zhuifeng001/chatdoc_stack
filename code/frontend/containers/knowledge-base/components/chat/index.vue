<template>
  <div :class="['scroll-bar', $style['chat']]">
    <ChatHeader
      v-model:activeKey="activeKey"
      @re-quiz="store.onReQuizLastQuestion()"
      @re-infer="store.createNewChat(false)"
      @reGenerate="store.getDocumentSummary(true)"
      @copy-summary="copy(currentSummary)"
    />
    <ClientOnly>
      <ChatSummary v-show="activeKey == ChatTypeEnums.SUMMARY" />
    </ClientOnly>
    <div style="height: 100%">
      <ChatWindow v-show="activeKey == ChatTypeEnums.CHAT" :qa-list="qaList" />
      <ChatInput />
    </div>
    <div id="TourStep5"></div>
    <div id="TourStep6"></div>
  </div>
</template>
<script lang="ts" setup>
import ChatHeader from './ChatHeader.vue'
import ChatWindow from './ChatWindow.vue'
import ChatInput from './ChatInput.vue'
import ChatSummary from './ChatSummary.vue'
import { useKBStore } from '../../store'
import { storeToRefs } from 'pinia'
import { ChatTypeEnums, copy } from './helper'

const store = useKBStore()
const { qaList, currentSummary } = storeToRefs(store)
const activeKey = ref(currentSummary.value ? ChatTypeEnums.SUMMARY : ChatTypeEnums.CHAT)

onMounted(() => {
  activeKey.value = ChatTypeEnums.CHAT
})
</script>
<style lang="less" module>
.chat {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 0 0 0 0;
  background-color: #f9fafb;

  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow-x: hidden;
}
</style>
