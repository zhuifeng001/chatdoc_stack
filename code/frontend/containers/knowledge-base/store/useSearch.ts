import { getKBDocumentList } from '@/api/knowledge-base'
import { ref } from 'vue'
import { formatFile } from './helper'
import type { KBLibraryStore } from './useKBLibraryStore'

/**
 * 搜索状态
 * 0 未搜索, 1 开始搜索，2 搜索中， 3 搜索结束
 */
export enum SearchStatusEnums {
  INIT = 0,
  START = 1,
  DOING = 2,
  DONE = 3
}

export const useSearch = ({ kbLibraryStore }: { kbLibraryStore: KBLibraryStore }) => {
  const { selectedKBLibrary } = kbLibraryStore
  const searchStatus = ref(SearchStatusEnums.INIT)
  const searchResults = ref<any[]>([])
  const searchKeyword = ref('')
  const hasSearched = ref(false)

  const resetSearchStatus = () => {
    searchKeyword.value = ''
    searchStatus.value = SearchStatusEnums.INIT
    hasSearched.value = false
  }

  const onSearch = async (keywords: string) => {
    if (!keywords) {
      resetSearchStatus()
      return
    }

    searchKeyword.value = keywords
    searchStatus.value = SearchStatusEnums.DOING
    const res = await getKBDocumentList({ libraryId: selectedKBLibrary.value?.id, keywords, page: 1, pageSize: 10000 }).catch(e => {
      return e
    })
    const resFileList = res.data?.list?.map(file => {
      formatFile(file)
      return file
    })
    searchResults.value = resFileList || []
    searchStatus.value = SearchStatusEnums.DONE
    hasSearched.value = true
  }

  return { searchKeyword, searchStatus, searchResults, onSearch, resetSearchStatus, hasSearched }
}
