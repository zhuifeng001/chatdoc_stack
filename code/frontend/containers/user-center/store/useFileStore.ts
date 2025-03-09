import { cloneDeep } from 'lodash-es'
import {
  deleteFolderAPI,
  deleteDocumentAPI,
  getFolderChildrenAPI,
  moveFolderAPI,
  moveDocumentAPI,
  updateFolderAPI,
  updateDocumentAPI
} from '~/api'
import { getDefaultPagination } from '~/components/common/Pagination/helper'
import { formatFile, isParsingFile } from '~/containers/knowledge-base/store/helper'
import {
  formatFolder,
  formatFolderFileList,
  sortFolderFileList,
  type UserKBFolderOrFile,
  type MoveKBFolderParam,
  type UserKBFile
} from '../helpers/user-folder-file'
import { addUserFile, addUserFolder, getDocumentByIds } from '~/api'
import { KB_FINANCIAL_ID } from '~/containers/knowledge-base/helper'
import { useFileSElection } from './useFileSelection'
import type { FileSearchCondition, UserFolder } from '~/containers/knowledge-base/types'
import { useMyLibrary } from './useMyLibrary'
import { useUpload } from './useUpload'

export const useFileStore = defineStore('useFileStore', () => {
  const listPagination = getDefaultPagination()
  const listSearchCondition = reactive<FileSearchCondition>({})
  const dataList = ref<UserKBFolderOrFile[]>([])
  const originalList = ref<UserKBFolderOrFile[]>([])
  const loading = ref(true)
  const route = useRoute()
  const folderIdByPage = computed(() => route.params?.id)
  const selectedFolder = ref<UserFolder>()
  const folderSelectVisible = ref(false)
  // 表格选择
  const selectedRowKeys = ref<(number | string)[]>([])
  const fileStoreEvent = useEventBus('file-store')

  // layout 相关
  const folderCollapsed = ref(true)

  const libraryStore = useMyLibrary()
  const { userFolders } = storeToRefs(libraryStore)
  const isSearchState = computed(() => route.path.includes('/financial/user-kb/search'))

  // 本页选中的文档
  const checkedDocumentByPage = computed(() => {
    return dataList.value.filter(o => o._checked)
  })
  // 本页是否全选
  const isAllCheckedByPage = computed(() => checkedDocumentByPage.value.length === dataList.value.length)

  const onCancelSelected = () => {
    dataList.value.map(o => {
      o._checked = false
    })
    selectedRowKeys.value = []
  }

  const resetSearch = () => {
    listSearchCondition.keyword = void 0
    listSearchCondition.sort = void 0
    listSearchCondition.id = void 0
  }

  /**
   * 删除文件夹
   * @param folderId 文件夹id
   * @returns
   */
  const deleteFolder = async (folderId: number[]) => {
    const res = await deleteFolderAPI({
      ids: folderId,
      deleteDocument: true
    })
    return res
  }

  /**
   * 移动文件夹位置
   * @param arr [{id: number, targetId: number}]
   * @returns
   */
  const moveFolder = async (arr: MoveKBFolderParam[]) => {
    const res = await moveFolderAPI(arr)
    return res
  }

  const initPage = async () => {
    await getUserFolder()
  }

  const resetPage = () => {}

  const focusFolder = (folder?: UserFolder, to = true) => {
    if (!folder) return
    selectedFolder.value = folder
    getFolderFile()
    to && router.push('/financial/user-kb/folder/' + folder.id)
  }

  const getUserFolder = async () => {
    return libraryStore.getMyLibraryData()
  }

  const lastFolderId = ref(folderIdByPage.value)
  watch(
    folderIdByPage,
    async folderId => {
      if (folderId) {
        lastFolderId.value = folderId
      }
    },
    { immediate: true }
  )

  /**
   * 获取文件夹下的 文件夹或文件
   */
  const getFolderFile = async (global = false) => {
    loading.value = true

    const res = await getFolderChildrenAPI({
      noChildTree: true,
      sortType: ['recentUpdate', 'recentUsed'].includes(listSearchCondition.sort as string) ? 'DESC' : 'ASC',
      ...listSearchCondition,
      id: global ? void 0 : selectedFolder.value?.id || void 0
    })

    loading.value = false

    let list = formatFolderFileList(res?.data || [])
    if (!listSearchCondition.sort) {
      list = sortFolderFileList(list)
    }
    originalList.value = cloneDeep(list)
    dataList.value = list

    // dataList.value = []
    // if (list.length > 1) {
    //   const step = 1
    //   let i = 0
    //   while (dataList.value.length < list.length) {
    //     dataList.value.push(...list.slice(i, i + step))
    //     await useIdlePromise(() => {})
    //     i += step
    //   }
    // } else {
    //   dataList.value = list
    // }

    listPagination.total = dataList.value.length
    loopParsingFiles()
  }

  const globalLoopStatusTimer = ref<NodeJS.Timeout>()
  onBeforeUnmount(() => {
    if (globalLoopStatusTimer.value) {
      clearTimeout(globalLoopStatusTimer.value)
    }
  })
  onDeactivated(() => {
    if (globalLoopStatusTimer.value) {
      clearTimeout(globalLoopStatusTimer.value)
    }
  })
  onActivated(() => {
    loopParsingFiles()
  })
  const getParsingFiles = async () => {
    const ids = parsingFiles.value.map(o => o.id)
    if (!ids.length) return
    const res = await getDocumentByIds({ ids: ids })
    const files = res.data || []
    parsingFiles.value = parsingFiles.value.filter(o => {
      const current = files.find(p => p.uuid === o.uuid) as UserKBFile
      if (!current) return false
      // 更新状态、封面、总页数
      o.status = current.status
      o.extraData ||= {} as any
      o.extraData.cover = current.extraData.cover
      o.extraData.pageNumber = current.extraData.pageNumber
      return isParsingFile(current.status)
    })
    if (parsingFiles.value.length) {
      if (globalLoopStatusTimer.value) {
        clearTimeout(globalLoopStatusTimer.value)
      }
      globalLoopStatusTimer.value = setTimeout(async () => {
        await getParsingFiles()
      }, 1500)
    }
  }

  // 轮询文件解析状态
  const parsingFiles = ref<UserKBFile[]>([])
  const loopParsingFiles = () => {
    parsingFiles.value = dataList.value.filter(o => o._type === 'file' && isParsingFile(o.status)) as UserKBFile[]
    if (parsingFiles.value.length) {
      if (globalLoopStatusTimer.value) {
        clearTimeout(globalLoopStatusTimer.value)
      }
      globalLoopStatusTimer.value = setTimeout(async () => {
        await getParsingFiles()
      }, 1500)
    }
  }

  const templateFolderName = '新建文件夹'
  const findExistFolder = (folderName: string) => {
    return dataList.value.some(o => o._type === 'folder' && o.name === folderName)
  }

  const addFolder = async (title: string = templateFolderName, parentId?: number | string) => {
    // 改由接口实现
    // if (findExistFolder(title)) {
    //   let i = 1
    //   while (true) {
    //     const newFolderName = templateFolderName + (i === 1 ? '' : `（${i}）`)
    //     if (!findExistFolder(newFolderName)) {
    //       await addFolder(newFolderName, parentId)
    //       break
    //     }
    //     i++
    //     if (i === 50) break
    //   }
    //   return
    // }
    const res = await addUserFolder({ name: title, libraryId: KB_FINANCIAL_ID, parentId })
    const folderObj = formatFolder(res?.data)
    return folderObj
  }

  const addFile = async (fileInfo: any, folderId: number, progressCallback?) => {
    const hasDirectory = folderId != null
    let file = fileInfo.originFileObj as Blob | File
    if (isTiffByMineType(file.type)) {
      file = await convertTiffToPNG(file)
    }
    try {
      const res = await addUserFile(
        file,
        {
          libraryId: KB_FINANCIAL_ID,
          folderId: hasDirectory ? folderId : undefined, // 考虑没有文件夹
          filename: fileInfo.name
        },
        progressCallback
      )

      const fileObj = formatFile(res?.data)
      // getFolderFile()
      return fileObj
    } catch (error: any) {
      return error?.response?.data?.msg || '上传失败'
    }
  }

  /**
   * 更新文件夹名称
   * @param folderId 文件夹id
   * @param title 文件夹名称
   * @returns
   */
  const updateFolder = async (folderId: number | string, title: string) => {
    const res = await updateFolderAPI({ id: folderId, name: title })
    return res
  }

  const updateDocument = async (documentId: number, name: string) => {
    const res = await updateDocumentAPI({ id: documentId, name })
    return res
  }

  const deleteDocument = async (documentId: number[]) => {
    const res = await deleteDocumentAPI({ ids: documentId })
    return res
  }

  const moveDocument = async (arr: any[]) => {
    const res = await moveDocumentAPI(arr)
    getFolderFile()
    return res
  }

  const batchMoveFiles = async (folderId: number) => {
    if (!selectedFolder.value) return
    const selectedFiles = dataList.value.filter(o => o._checked)
    if (!selectedFiles?.length) return

    const res = await moveDocumentAPI(
      selectedFiles.map(o => ({
        documentId: o.id,
        folderId
      }))
    )
    folderSelectVisible.value = false
    getUserFolder()
    getFolderFile()
    return res
  }

  const router = useRouter()
  const toAsk = data => {
    data.personal = true
    router.push({ name: 'knowledge-base', state: { data: JSON.stringify(data) } })
  }

  return {
    folderCollapsed,
    isSearchState,
    onCancelSelected,
    resetSearch,
    ...useUpload(),
    fileStoreEvent,
    initPage,
    resetPage,
    getUserFolder,
    focusFolder,
    batchMoveFiles,
    userFolders,
    selectedFolder,
    folderSelectVisible,
    folderIdByPage,
    lastFolderId,
    selectedRowKeys,
    loading,
    dataList, //
    originalList,
    listPagination,
    listSearchCondition,
    checkedDocumentByPage,
    isAllCheckedByPage,
    deleteFolder,
    deleteDocument,
    getFolderFile,
    addFile,
    addFolder,
    moveFolder,
    moveDocument,
    updateFolder,
    updateDocument,
    toAsk,
    ...useFileSElection({ dataList })
  }
})
