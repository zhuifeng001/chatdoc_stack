<template>
  <ClientOnly>
    <div id="pagination" :class="$style.pagination"></div>
    <div :class="[$style['user-kb-container'], 'scroll-bar']">
      <!-- <OfficialKB v-if="official" style="margin-bottom: 20px" /> -->
      <UserKB style="margin-bottom: 0px" />
    </div>
  </ClientOnly>
</template>

<script lang="ts" setup>
import OfficialKB from './OfficialKB.vue'
import UserKB from './UserKB.vue'

defineProps({
  official: {
    type: Boolean,
    default: true
  }
})
</script>
<style lang="less" module>
.user-kb-container {
  position: relative;
  height: 100%;
  padding: 20px 10px 20px 20px;
  background: #fff;
  overflow-y: scroll;
}
.pagination {
  width: 100%;
}
</style>
