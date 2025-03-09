<script setup lang="ts">
import { ArrowRight } from '@icon-park/vue-next'
import ContactUs from '~/containers/financial/components/layout/ContactUs.vue'
import PageFooter from '~/containers/financial/components/layout/PageFooter.vue'
import { GlobalQATypeOptions } from '~/containers/global-qa/components/helper'
import { useGlobalQAStore } from '~/containers/global-qa/store'
import SendFilled from '~/containers/knowledge-base/images/SendFilled.vue'

const router = useRouter()
const question = ref('')

const onInferByKeyboardEvent = (e: KeyboardEvent) => {
  if (e.shiftKey) {
    return
  }
  onInfer(question.value)
}

const onInfer = (q: string) => {
  if (!q) return
  router.push({ path: '/global/search', query: { question: q, qaType: globalQAType.value } })
}

const globalQAStore = useGlobalQAStore()
const { globalQAType } = storeToRefs(globalQAStore)

const questions = [
  // '2024年上半年进出口数据',
  // '宁德时代2024年上半年经营情况',
  // '新能源汽车产业发展情况',
  // '上汽集团2024年净利润同比变动情况'
]

const onClear = () => {
  question.value = ''
}

onDeactivated(() => {
  onClear()
})
onUnmounted(() => {
  onClear()
})
</script>
<template>
  <section :class="$style['global-qa-entry']">
    <div :class="$style['global-qa-wrapper']">
      <div class="text-3xl leading-[42px] text-center font-bold mb-10">知识库检索</div>
      <div :class="$style['global-qa-container']">
        <a-textarea
          :class="['scroll-bar rounded-lg break-all', $style.input]"
          v-model:value="question"
          placeholder="有问题尽管问我，Shift + Enter 换行"
          :maxlength="300"
          :autoSize="false"
          @press-enter="onInferByKeyboardEvent"
        />
        <div class="absolute right-3 top-[88px] z-10 flex items-center">
          <span class="text-gray-600">{{ question?.length || 0 }}/300</span>
          <a-button
            :class="['ml-2 rounded-full', $style.send]"
            type="primary"
            title="提问"
            :disabled="!question"
            @click="onInfer(question)"
          >
            <SendFilled class="w-4 h-4" />
          </a-button>
        </div>

        <div class="absolute left-0 top-[80px] w-full bg-white px-3 py-1 rounded-b-lg">
          <a-segmented
            :class="[$style.segmented]"
            v-model:value="globalQAType"
            :options="GlobalQATypeOptions"
          ></a-segmented>
        </div>
        <a-card :class="[$style.card, 'mt-6']" title="" :bordered="false">
          <div
            :class="[
              $style.item,
              'mt-2 mb-2 mr-3 px-5 cursor-pointer h-10 flex items-center justify-between rounded-full text-gray-700 hover:text-primary-color bg-gray-200 hover:bg-[#dfe2e7] transition-all duration-300'
            ]"
            v-for="(q, i) in questions"
            :key="i"
            @click="onInfer(q)"
            :data-aos="i % 2 ? 'fade-left' : 'fade-right'"
            :data-aos-delay="(i + 1) * 100"
            data-aos-duration="500"
            data-aos-once="true"
          >
            <span>{{ q }}</span>
            <ArrowRight />
          </div>
        </a-card>
      </div>
    </div>
    <!-- <ContactUs /> -->
    <!-- <PageFooter class="mt-6 !bg-transparent" /> -->
  </section>
</template>
<style lang="less" module>
.global-qa-entry {
  position: relative;
  padding: 40px 30px 0px;
  max-width: var(--max-width);
  width: 100%;
  margin: auto;
  min-height: 100vh;
  // background-color: #f6f7fb;

  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .global-qa-wrapper {
    padding-top: min(80px, 10vh);
  }

  .global-qa-container {
    position: relative;
    max-width: 750px;
    margin: auto;

    .input {
      padding: 12px 12px 12px;
      width: 100%;
      height: 100%;
      min-height: 120px;
      background: #ffffff;

      &:global(.ant-input) {
        border-color: #fefefe !important;
        box-shadow: 0 0 18px rgba(3, 10, 26, 0.05) !important;
        background: #ffffff;
        backdrop-filter: blur(4px);
        resize: none;
      }
    }

    .send {
      height: 28px;
      border: 0;
      outline: 0;
      background-color: transparent;
      background-image: linear-gradient(-20deg, #b721ff 0%, #21d4fd 100%);
      transition: all 0.3s;

      &[disabled] {
        filter: grayscale(0.1);
        color: #fff;
      }
    }

    .segmented {
      padding: 4px 0;
      // box-shadow: 0px 0px 8px 0px rgba(62, 62, 62, 0.2);
      background-color: #fff;
      font-size: 13px;

      :global {
        .ant-segmented-item {
          margin-right: 8px;
          &:not(.ant-segmented-item-selected):not(.ant-segmented-item-disabled)::after {
            background-color: rgba(0, 0, 0, 0.06);
            border-radius: 28px;
          }

          &:hover {
            border-radius: 28px;
          }
        }
        .ant-segmented-item-selected,
        .ant-segmented-thumb {
          color: #333;
          color: #fff;
          // background-image: linear-gradient(to left, #79a4ff 0%, var(--primary-color) 100%);
          background-image: linear-gradient(160deg, #9b2cfc 0%, #5f9aff 100%);
          border-radius: 28px;
        }
      }
    }
  }

  .card {
    background-color: transparent;
    box-shadow: none;
    // background: radial-gradient(49% 49% at 23% 90%, rgba(121, 215, 255, 0.3) 0, rgba(51, 192, 253, 0) 100%),
    // radial-gradient(122% 122% at 94% -6%, #e9f3ff 0, #f7f8fc 100%);
    backdrop-filter: (29px);

    .item {
      width: calc(50% - 6px);
      background: linear-gradient(270deg, #d7e5ff 0%, #d8e4f3 53%, #daeefc 100%);

      &:nth-of-type(2n) {
        margin-right: 0;
      }
      &:hover {
        opacity: 0.9;
      }
    }

    :global(.ant-card-body) {
      padding: 4px 0;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
    }
  }
}
</style>
