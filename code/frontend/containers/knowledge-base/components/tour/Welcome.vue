<template>
  <a-modal
    :wrapClassName="$style['welcome-modal']"
    v-model:open="welcomeVisible"
    :keyboard="false"
    :maskClosable="false"
    :closable="false"
    style="width: 560px"
    :maskStyle="{ backgroundColor: 'rgba(14, 18, 26, 0.7)' }"
    :footer="null"
  >
    <CloseCircleFilled :class="$style['welcome-close']" @click="onOk" />
    <div :class="$style['welcome-bg']">
      <NuxtImg src="/assets/images/welcome-banner.png" alt="" format="webp" :quality="100" />
    </div>
    <div :class="$style['welcome-title']">欢迎来到财经知识库！</div>
    <div :class="$style['welcome-desc']">
      帮助您以简单、高效的方式阅读报告：<br />
      从知识库提取报告/上传文件，并用自然语言与我聊天！<br />
      左侧是原始文档，右侧是聊天框，您可以要求我对报告进行总结、提取、查找信息和进行分析，辅助您进行风险管理决策
    </div>
    <div :class="$style['welcome-btn']">
      <a-button @click="onCancel">关闭</a-button>
      <a-button type="primary" @click="onOk">立即体验</a-button>
    </div>
  </a-modal>
</template>
<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import { useUser } from '../../store/useUser'
import { ref } from 'vue'
import { useTour } from '../../store/useTour'
import CloseCircleFilled from './images/CloseCircleFilled.vue'

const userStore = useUser()
const { isLogin } = storeToRefs(userStore)
const tourStore = useTour()
const { welcomeVisible } = storeToRefs(tourStore)

const onCancel = () => {
  welcomeVisible.value = false
}

const onOk = () => {
  welcomeVisible.value = false
  if (!isLogin.value) {
    userStore.showLogin()
  }
}
</script>
<style lang="less" module>
.welcome-modal {
  :global {
    .ant-modal-content {
      background-color: transparent;
      border-radius: 4px;
    }
    .ant-modal-body {
      border-radius: 5px;
      padding: 0;
      background: #fff;
    }
  }

  .welcome-close {
    position: absolute;
    right: 0;
    top: -30px;
    width: 24px;
    height: 24px;
    color: #959ba6;
    cursor: pointer;
  }

  .welcome-bg {
    position: relative;
    width: 100%;
    height: 280px;
    border-radius: 4px 4px 0px 0px;

    img {
      width: 100%;
      height: 100%;
    }
  }

  .welcome-title {
    padding: 0 30px;
    margin-top: 28px;
    font-size: 20px;
    font-weight: 500;
    color: #000000;
    line-height: 28px;
  }

  .welcome-desc {
    margin-top: 6px;
    padding: 0 30px;
    font-size: 14px;
    font-weight: 400;
    color: #51565e;
    line-height: 20px;
  }

  .welcome-btn {
    padding: 36px 30px 30px;
    text-align: right;

    :global {
      .ant-btn {
        margin-left: 8px;
        border-radius: 4px;
      }
    }
  }
}
</style>
