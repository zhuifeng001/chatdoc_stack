<script setup lang="ts">
defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    default: 42
  }
})
</script>
<template>
  <NuxtImg
    v-if="isPDF(name)"
    src="/assets/images/files/ic-draft-pdf.png"
    format="webp"
    :width="size + 'px'"
    :height="size + 'px'"
  />
  <NuxtImg
    v-else-if="isImage(name)"
    src="/assets/images/files/ic-draft-img.png"
    format="webp"
    :width="size + 'px'"
    :height="size + 'px'"
  />
  <NuxtImg
    v-else-if="isEXCEL(name)"
    src="/assets/images/files/ic-draft-excel.png"
    format="webp"
    :width="size + 'px'"
    :height="size + 'px'"
  />
  <NuxtImg
    v-else-if="isWORD(name)"
    src="/assets/images/files/ic-draft-word.png"
    format="webp"
    :width="size + 'px'"
    :height="size + 'px'"
  />
  <NuxtImg
    v-else-if="isTXT(name)"
    src="/assets/images/files/ic-draft-txt.png"
    format="webp"
    :width="size + 'px'"
    :height="size + 'px'"
  />
</template>
