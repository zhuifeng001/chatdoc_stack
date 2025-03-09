import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useTheme = defineStore('theme', () => {
  const fontSizeValue = ref(14)
  const fontSize = computed(() => fontSizeValue.value + 'px')

  return { fontSizeValue, fontSize }
})
