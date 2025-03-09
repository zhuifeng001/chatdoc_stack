import { defineStore } from 'pinia'
import type { UserFolder } from '~/containers/knowledge-base/types'
import { getMyLibraryList } from '~/api'

export const useMyLibrary = defineStore('myLibrary', () => {
  const myLibraryData = ref<{ documentCount?: number; children: any[] }>()
  const officialLibraryData = ref()
  const initMenu = ref(true)
  const userFolders = ref<UserFolder[]>([])

  const getMyLibraryData = async () => {
    try {
      const { data } = await getMyLibraryList({ noDocument: true })
      myLibraryData.value = data || []
      // officialLibraryData.value = data.official
      initMenu.value = false
      userFolders.value = data?.children || []
      return data
    } catch (error) {
      return null
    }
  }

  return {
    userFolders,
    myLibraryData,
    officialLibraryData,
    getMyLibraryData,
    initMenu
  }
})
