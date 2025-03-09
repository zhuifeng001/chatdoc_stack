<template>
  <div :class="[$style['page-layout']]">
    <div v-if="slots.top" :class="[$style['page-top-wrapper']]">
      <slot name="top" />
    </div>
    <div :class="[$style['page-wrapper'], wrapperClass]">
      <div :class="$style['page-container']">
        <slot />
      </div>
    </div>
    <slot name="bottom" />
    <!-- <ContactUs /> -->
    <!-- <PageFooter /> -->
  </div>
</template>
<script lang="ts" setup>
import PageHeader from './PageHeader.vue'
import PageFooter from './PageFooter.vue'
import ContactUs from './ContactUs.vue'
import LoginModal from '~/containers/knowledge-base/components/LoginModal.vue'

defineProps({
  wrapperClass: {
    type: String
  }
})
const slots = useSlots()
</script>
<style lang="less" module>
@page-min-width: var(--min-width);

.page-layout {
  position: relative;
  width: 100%;
  min-width: @page-min-width;

  .page-top-wrapper {
    transition: padding 0.3s;
  }

  .page-wrapper {
    padding: 0 0 0;
    width: 100%;
    min-width: @page-min-width;

    transition: padding 0.3s;
  }

  .page-container {
    max-width: var(--max-width);
    width: 100%;
    margin: 0 auto;
    padding: 0 60px 30px;
  }
}
</style>
