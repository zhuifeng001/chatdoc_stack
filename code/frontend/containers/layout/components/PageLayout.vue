<template>
  <NuxtLayout>
    <main :class="[$style['page-layout'], routeState.bgClass, expand ? $style['nav-expand'] : '']">
      <PageNav v-model:expand="expand" />
      <PageUser />
      <div :class="[$style['page-wrapper']]">
        <NuxtPage :keepalive="keepaliveConfig" />
      </div>
      <LoginModal />
    </main>
  </NuxtLayout>
</template>
<script lang="ts" setup>
import LoginModal from '~/containers/knowledge-base/components/LoginModal.vue'
import PageNav from '~/containers/layout/components/PageNav.vue'
import PageUser from '~/containers/layout/components/PageUser.vue'

const keepaliveConfig = {
  include: ['index', 'global', 'public', 'creative']
} //  'user-kb'

const expand = ref(true)
const route = useRoute()
const styles = useCssModule()
const routeState = reactive({
  bgClass: ''
})
watch(
  () => route.path,
  path => {
    switch (path) {
      case '/financial/':
        routeState.bgClass = styles['global-bg']
        break
      case '/financial/public':
        routeState.bgClass = styles['financial-bg']
        break
      default:
        routeState.bgClass = 'bg-gray-100'
        break
    }
  },
  { immediate: true }
)
</script>
<style lang="less" module>
@page-min-width: var(--max-width);

.page-layout {
  position: relative;
  width: 100%;
  min-width: @page-min-width;

  &.nav-expand {
    .page-wrapper {
      padding-left: 210px;
    }
  }

  .page-wrapper {
    padding-left: 74px;
    width: 100%;
    min-width: @page-min-width;

    transition: padding 0.3s;
  }
}

.global-bg {
  background-image: linear-gradient(-225deg, #c5e4ff 0%, #ffffff 48%, #bfd8fc 100%);
  background-repeat: no-repeat;
  min-height: 100vh;
}

.financial-bg {
  background-image: url(/assets/images/financial/bg.jpg);
  background-repeat: no-repeat;
}
</style>
