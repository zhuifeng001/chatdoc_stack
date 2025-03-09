import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLayout = defineStore('layout', () => {
  const showSidebar = ref(true)

  const onChangeShowSidebar = (value: boolean): void => {
    showSidebar.value = value
  }

  return { showSidebar, onChangeShowSidebar }
})
