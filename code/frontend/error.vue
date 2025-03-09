<template>
  <div
    class="font-sans antialiased bg-white dark:bg-black text-black dark:text-white grid min-h-screen place-content-center overflow-hidden"
  >
    <div class="text-center m-auto">
      <h1 class="text-8xl sm:text-10xl font-medium mb-8">{{ error?.statusCode }}</h1>
      <p class="text-xl px-8 sm:px-0 sm:text-4xl font-light mb-16 leading-tight">发生错误： {{ error }}</p>
      <Button @click="handleError">返回首页</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from 'ant-design-vue'
defineProps({
  error: {
    type: Object
  }
})

const handleError = () => clearError({ redirect: '/' })
</script>
