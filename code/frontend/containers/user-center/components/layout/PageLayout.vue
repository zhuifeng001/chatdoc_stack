<template>
  <NuxtLayout>
    <main class="user-center">
      <PageHeader />
      <LoginModal />
      <a-layout hasSider class="user-center-layout">
        <a-layout-sider theme="light" width="240px">
          <Sidebar />
        </a-layout-sider>
        <a-layout-content class="user-center-container">
          <NuxtPage />
        </a-layout-content>
      </a-layout>
    </main>
  </NuxtLayout>
</template>
<script lang="ts" setup>
import PageHeader from './PageHeader.vue'
import Sidebar from './Sidebar.vue'
import LoginModal from '~/containers/knowledge-base/components/LoginModal.vue'
</script>
<style lang="less" module>
//
</style>
