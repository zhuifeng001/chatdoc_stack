import { defineStore } from 'pinia'

export const useGlobal = defineStore('global', () => {
  const selectIds = ref<any>();

  return {
    selectIds
  }
})