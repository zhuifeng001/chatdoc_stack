import { getKBLibraryList } from '@/api/knowledge-base'
import { computed, ref } from 'vue'
import { KB_FINANCIAL_ID } from '../helper'
import { useDocumentStore } from '~/components/common/mark/store/useDocumentStore'

export type KBLibraryStore = ReturnType<typeof useKBLibraryStore>

export type BriefOPtions =
  | 'load' // 加载brief，直接渲染，提高图片加载速度
  | 'merge' // 请求brief，不直接渲染，合并doc_parser后渲染
  | 'none' // 不请求brief

export type DocumentDetailOptions = {
  brief?: BriefOPtions
}

export const useKBLibraryStore = () => {
  const libraryList = ref<any[]>([])

  const selectKBLibrary = item => {
    selectedKeys.value = [item.key]
  }
  const selectedKeys = ref<any[]>([KB_FINANCIAL_ID])

  const selectedKBLibrary = computed(() => {
    return libraryList.value.find(o => o.id === selectedKeys.value[0])
  })
  // 是否是财经知识库
  const isFinancialKB = computed(() => selectedKeys.value[0] === 1)

  const getLibraryList = async () => {
    const res = await getKBLibraryList({ type: 0 }).catch(e => {})
    libraryList.value = res?.data || []
    if (libraryList.value.length) {
      selectedKeys.value = [libraryList.value[0].id]
    }
    return libraryList
  }

  const documentStore = useDocumentStore()

  return {
    libraryList,
    getLibraryList,
    selectedKeys,
    selectKBLibrary,
    selectedKBLibrary,
    isFinancialKB,
    ...documentStore
  }
}
