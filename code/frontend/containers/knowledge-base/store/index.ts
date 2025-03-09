import { defineStore, storeToRefs } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import {
  addUserFolder,
  addUserFile,
  updateFileFolder,
  getKBDocumentList,
  updateFolderFileSort,
  getDocumentByIds
} from '@/api/knowledge-base'
import type { UserFile, UserFileData, UserFolder } from '../types'
import { useSearch } from './useSearch'
import { useKBLibraryStore } from './useKBLibraryStore'
import {
  FileStatusEnums,
  KB_FOLDER_ID,
  OTHER_FOLDER_ID,
  formatFile,
  formatFolder,
  isFailedFile,
  isParsingFile,
  isSucceedFile
} from './helper'
import { useChat } from './useChat'
import { useUser } from './useUser'
import { convertTiffToPNG, isTiffByMineType } from '@/utils/file'
import { useEditTitle } from '../hooks/useEditTitle'
import { useDocumentListSort } from './useDocumentListSort'
import { useFinancialStore } from '~/containers/financial/store'
import useEventEmitter from 'mitt'

export type KBHistoryState = {
  ids?: number[]
  folderIds?: number[]
  from?: 'cart' | 'record'
  personal: boolean
  recordId?: number
}

export const useKBStore = defineStore('kb', () => {
  const route = useRoute()
  const userFileData = ref<any[]>([])
  const fileTreeData = ref<any[]>([])
  const originFileData = ref<UserFileData[]>([])
  const userFileMap = ref<Map<string, UserFileData>>()
  const selectedItem = ref<any>()
  const selectedFile = ref<any>()
  const previewFile = ref<any>()
  const sidebarSearchVisible = ref(false)
  const checkedKeys = ref<string[]>([])

  /**
   * 扁平化文件数据
   */
  const fileFlatData = computed<UserFile[]>(() => {
    const flat: UserFile[] = []
    const collect = (data: any[]) => {
      for (const item of data) {
        if (item.type === 'file') {
          flat.push(item)
        }
        if (item.children?.length) {
          collect(item.children)
        }
      }
    }
    collect(userFileData.value)
    return flat
  })
  /**
   * 多文档模式
   */
  const isMultiDocumentsMode = computed(() => !historyStateData.value?.ids?.length || fileFlatData.value.length > 1)

  const isPersonalKB = computed(() => !!historyStateData.value?.personal)

  watch(selectedFile, () => {
    if (selectedFile.value) {
      previewFile.value = selectedFile.value
    }
  })
  watch(previewFile, () => {
    if (previewFile.value) {
      kbLibraryStore.getDocumentDetail({
        id: previewFile.value.id,
        document_type: historyStateData.value?.personal ? '1' : '0'
      })
    }
  })

  const userStore = useUser()
  const { userToken } = storeToRefs(userStore)

  const sortStore = useDocumentListSort({ originFileData, userFileData })
  watch(userFileData, () => {
    fileTreeData.value = userFileData.value
  })

  watch(
    fileTreeData,
    () => {
      userFileMap.value = new Map()
      const collect = (item, _paths: string[] = []) => {
        item._paths ??= []
        item._paths.unshift(item._id, ..._paths)
        userFileMap.value?.set(item._id, item)
        if (item.type === 'folder' && item.children?.length) {
          item.children.forEach(o => collect(o, item._paths))
        }
      }
      for (const item of fileTreeData.value) {
        collect(item)
      }
    },
    { immediate: true }
  )

  // 是否多选
  const selectedMultiple = ref(false)
  const selectedAll = ref(false)
  const indeterminate = computed(() => {
    return checkedDocuments.value.length > 0 && checkedDocuments.value.length < fileFlatData.value.length
  })

  const onMultipleChange = v => {
    updateCheckedDocuments([selectedFile.value?._id].filter(Boolean))
  }
  const parsingFileList = ref<any[]>([])
  // 解析中的文件
  const handleParsingFileList = () => {
    parsingFileList.value = []

    const collect = (arr: any[] = []) => {
      arr.forEach(f => {
        if (f.type === 'file' && isParsingFile(f.status)) {
          parsingFileList.value.push(f)
        }
        if ('children' in f && f.children?.length) {
          collect(f.children)
        }
      })
    }
    collect(originFileData.value)

    startTimerForParsingFile()
  }

  const loopTimer = shallowRef<NodeJS.Timeout>()
  onBeforeUnmount(() => {
    if (loopTimer.value) {
      clearTimeout(loopTimer.value)
    }
  })
  onDeactivated(() => {
    if (loopTimer.value) {
      clearTimeout(loopTimer.value)
    }
  })
  onActivated(() => {
    startTimerForParsingFile()
  })
  const startTimerForParsingFile = () => {
    const startTimer = list => {
      if (loopTimer.value) {
        clearTimeout(loopTimer.value)
      }
      if (!isMultiDocumentsMode.value && list.length) {
        userFileLoading.value = true
      }

      // 如果解析时间超过2分钟，则提示用户
      if (new Date().getTime() - startTime.value.getTime() > 2 * 60 * 1000) {
        message.error('文档解析时间超时，请稍后再试')
        // 将解析中的文件状态设置为失败
        list
          .filter(file => isParsingFile(file.status))
          .forEach(file => {
            file.status = FileStatusEnums.FAILED
          })
        refreshFileList()
        return
      }

      loopTimer.value = setTimeout(async () => {
        if (!selectedFile.value) {
          userFileLoading.value = false
          selectFirstFile(fileFlatData.value.find(o => isSucceedFile(o.status)))
        }

        const ids = list.filter(file => isParsingFile(file.status)).map(file => file.id)
        if (!ids.length) {
          if (!isMultiDocumentsMode.value) {
            userFileLoading.value = false
          }

          // 是否是全部是失败
          if (fileFlatData.value.every(o => isFailedFile(o.status))) {
            message.error('文档解析失败，请稍后尝试')
          }
          return
        }
        const { data } = await getDocumentByIds({ ids })
        const nextList: any[] = []
        const fileMap = list.reduce((pre, cur) => ({ ...pre, [cur.id]: cur }), {})
        for (const detail of data) {
          const file = fileMap[detail.id]
          if (isSucceedFile(detail.status)) {
            file.status = FileStatusEnums.SUCCEED
          } else if (isFailedFile(detail.status)) {
            file.status = FileStatusEnums.FAILED
          } else {
            nextList.push(file)
          }
        }
        if (nextList.length !== list.length) {
          refreshFileList()
        }

        // 自动选中
        if (chatStore.qaList.value.length <= 1) {
          //  选中 file
          const succeedFiles = fileFlatData.value.filter(o => isSucceedFile(o.status))
          if (succeedFiles.length) {
            const keys = succeedFiles.map(o => o._id) as string[]
            updateCheckedDocuments(keys)
            checkedKeys.value = keys
            checkedDocuments.value = succeedFiles
          }
        }

        startTimer(nextList)
      }, 2000)
    }

    startTimer(parsingFileList.value)
  }

  const refreshFileList = () => {
    userFileData.value = [...userFileData.value] // 更新
  }

  const userFileLoading = ref(true)
  const historyStateData = ref<KBHistoryState>()
  // 对话列表和企业文档，显示排序功能
  const showSortTool = ref(false) // computed(() => historyStateData.value?.from === 'cart' || !historyStateData.value?.personal)
  const startTime = ref(new Date())
  const getDocumentList = async () => {
    userFileLoading.value = true
    // 未登录
    if (!userToken.value) {
      userFileLoading.value = false
      return
    }
    try {
      startTime.value = new Date()
      userFileData.value = []
      const documentIds = historyStateData.value?.ids
      const folderIds = historyStateData.value?.folderIds
      const res = await getDocumentByIds({ ids: documentIds, folderIds: folderIds })
      const tree = formatFolderAndFile(res?.data || [])
      originFileData.value = tree
      userFileData.value = tree
      handleParsingFileList()

      if (showSortTool.value) {
        // 首页、搜索进
        sortStore.sortByAddTime()
      } else if (historyStateData.value?.from === 'record') {
        // 问答记录进入
      }
      // 默认选中第一个文件
      const firstFile = findFirstFile(userFileData.value)
      selectFirstFile(firstFile)
    } catch (e) {
      console.log('e', e)
    } finally {
      userFileLoading.value = !selectedFile.value
      if (isMultiDocumentsMode.value) {
        userFileLoading.value = false
      }
    }
  }

  const selectFirstFile = firstFile => {
    if (!isMultiDocumentsMode.value) {
      if (firstFile) {
        onActive(firstFile)
        updateCheckedDocuments([firstFile._id])
      }
    } else {
      selectedMultiple.value = false
      selectedAll.value = false

      nextTick(() => {
        selectedMultiple.value = true
        selectedAll.value = true
        if (firstFile) {
          onActive(firstFile, true)
        }
      })
    }
  }

  const findFirstFile = (treeData: UserFileData[]) => {
    const dfs = data => {
      for (const item of data) {
        if (item.type === 'file' && isSucceedFile(item.status)) return item
        if (item.children?.length) {
          return dfs(item.children)
        }
      }
    }
    return dfs(treeData)
  }

  const kbLibraryStore = useKBLibraryStore()
  const { selectedKBLibrary } = kbLibraryStore

  const init = () => {
    selectedFile.value = undefined
    selectedItem.value = undefined
    selectedMultiple.value = false
    selectedAll.value = false
    kbLibraryStore.initPage()
    chatStore.initChat()
    console.log('history.state?.data', history.state?.data)
    const route = useRoute()
    historyStateData.value = JSON.parse(history.state?.data || route?.query?.data || '{}')
    getDocumentList()
  }

  const checkedFolders = ref<any[]>([])
  const checkedDocuments = ref<any[]>([])
  const updateCheckedDocuments = (checkedKeys: string[] | boolean = []) => {
    checkedFolders.value = []
    checkedDocuments.value = []

    const collectFiles = (data: any[], files: any[] = []) => {
      for (const item of data) {
        if (item.type === 'file') {
          files.push(item)
        }
        if (item.children?.length) {
          collectFiles(item.children, files)
        }
      }
      return files
    }

    const collectWithoutDummy = (item: UserFileData) => {
      if (!item) return
      if (item.type === 'folder') {
        if (item._dummy) {
          // 伪造文件夹不收集
          item.children?.forEach(o => {
            collectWithoutDummy(o)
          })
        } else {
          // 已存在就跳过
          if (item.id && !checkedFolders.value.some(o => o.id === item.id)) {
            checkedFolders.value.push(item)
          }
        }
      } else if (item.type === 'file') {
        if (isSucceedFile(item.status)) {
          // 已存在就跳过
          !checkedDocuments.value.some(o => o.id === item.id) && checkedDocuments.value.push(item)
        }
      }
    }

    // 单选
    if (!selectedMultiple.value) {
      collectWithoutDummy(selectedFile.value)
      return [...checkedDocuments.value, ...checkedFolders.value].map(o => o._id)
    }

    if (Array.isArray(checkedKeys)) {
      for (const _id of checkedKeys) {
        const item = userFileMap.value?.get(_id)
        item && collectWithoutDummy(item)
      }
      return [...checkedDocuments.value, ...checkedFolders.value].map(o => o._id)
    } else {
      // 选中全部
      if (checkedKeys) {
        const allItems = userFileMap.value?.values?.() || []
        for (const item of allItems) {
          item && collectWithoutDummy(item)
        }
      }
      return [...checkedDocuments.value, ...checkedFolders.value].map(o => o._id)
    }
  }

  const formatFolderAndFile = data => {
    if (!Array.isArray(data)) return []
    const tree = data.map(folder => {
      if (folder.uuid) {
        folder = formatFile(folder)
      } else {
        folder = formatFolder(folder)
      }
      folder.children = formatFolderAndFile(folder.children)
      return folder
    })
    return tree
  }

  const financialStore = useFinancialStore()
  const { selectedDocuments } = storeToRefs(financialStore)
  const updateHistoryState = () => {
    if (!history.state || !historyStateData.value || historyStateData.value?.from !== 'cart') return
    if (historyStateData.value?.ids) {
      historyStateData.value.ids = selectedDocuments.value.map(o => o.id)
    }
    history.state.data = JSON.stringify(historyStateData.value)
  }
  const removeFolder = (folder: UserFolder) => {
    const index = userFileData.value.findIndex(o => o.id === folder.id)
    if (index === -1) return
    userFileData.value.splice(index, 1)
    // 更新上一页的数据
    if (folder.children?.length && historyStateData.value?.from === 'cart') {
      folder.children.forEach(file => {
        const index = selectedDocuments.value.findIndex(doc => doc.id === file.id)
        if (index !== -1) {
          selectedDocuments.value.splice(index, 1)
          updateHistoryState()
        }
      })
    }
  }

  const removeFile = (file: UserFile) => {
    if (file.folderId != null) {
      // 文件夹、知识库内删除文件
      const folder = userFileData.value.find(o => o.id === file.folderId)
      const index = folder?.children?.findIndex(o => o.id === file.id)
      if (index == null || index === -1) return
      folder?.children.splice(index, 1)
    } else {
      // 直接删除文件
      const index = userFileData.value.findIndex(o => o.id === file.id)
      if (index === -1) return
      userFileData.value.splice(index, 1)
    }

    // 更新上一页的数据
    if (historyStateData.value?.from === 'cart') {
      const index = selectedDocuments.value.findIndex(doc => doc.id === file.id)
      if (index !== -1) {
        selectedDocuments.value.splice(index, 1)
        updateHistoryState()
      }
    }
  }

  const addFolder = async (title: string) => {
    const res = await addUserFolder({ name: title, libraryId: selectedKBLibrary.value?.id })
    const folderObj = formatFolder(res?.data)
    // let index = userFileData.value.findIndex(o => o.type === 'file')
    // if (index === -1) index = 0

    const folder: UserFolder = reactive(folderObj)
    userFileData.value.splice(1, 0, folder)
    return folder
  }

  const addFile = async (fileInfo: any, folderId: number = OTHER_FOLDER_ID) => {
    const hasDirectory = folderId != null && ![OTHER_FOLDER_ID, KB_FOLDER_ID].includes(folderId)
    let file = fileInfo.originFileObj as Blob | File
    if (isTiffByMineType(file.type)) {
      file = await convertTiffToPNG(file)
    }
    const res = await addUserFile(file, {
      libraryId: selectedKBLibrary.value?.id,
      folderId: hasDirectory ? folderId : undefined, // 考虑没有文件夹
      filename: fileInfo.name
    })

    // 首次添加文件
    // if (userFileData.value.length === 1) {
    //   await getDocumentList()
    //   return
    // }

    const fileObj = formatFile(res?.data)
    const fileItem: UserFile = reactive(fileObj)

    // 添加文件夹
    if (hasDirectory) {
      const directoryItem = userFileData.value.find(o => o.id === folderId)
      directoryItem?.children.unshift(fileItem)
    } else {
      // 默认是其他文件夹
      userFileData.value.splice(1, 0, fileItem)
    }

    handleParsingFileList()
  }

  const addFileIntoKB = async (files: UserFile[]) => {
    userFileData.value[0].children ??= []
    const children = userFileData.value[0].children
    for (const file of files) {
      !children.find(o => o.uuid === file.uuid) && children.push(file)
    }
  }

  const updateFolderSort$ = (folder1: UserFolder, folder2: UserFolder) => {
    return updateFolderFileSort([
      { id: folder1.id, sort: folder2.sort, type: 'folder' },
      { id: folder2.id, sort: folder1.sort, type: 'folder' }
    ]).then(() => {
      ;[folder1.sort, folder2.sort] = [folder2.sort, folder1.sort]
    })
  }
  const updateFileSort$ = (file1: UserFile, file2: UserFile) => {
    return updateFolderFileSort([
      { id: file1.id, sort: file2.sort, type: 'document' },
      { id: file2.id, sort: file1.sort, type: 'document' }
    ]).then(() => {
      ;[file1.sort, file2.sort] = [file2.sort, file1.sort]
    })
  }
  const updateFolderFileSort$ = (file1: UserFileData, file2: UserFileData) => {
    return updateFolderFileSort([
      { id: file1.id, sort: file2.sort, type: file1.type === 'file' ? 'document' : 'folder' },
      { id: file2.id, sort: file1.sort, type: file2.type === 'file' ? 'document' : 'folder' }
    ]).then(() => {
      ;[file1.sort, file2.sort] = [file2.sort, file1.sort]
    })
  }
  const updateFileFolder$ = (file: UserFile, folder: UserFolder) => {
    return updateFileFolder([
      {
        documentId: file.id,
        folderId: folder.id
      }
    ])
  }

  const onSelect = async (source, only_preview = false) => {
    if (selectedItem.value?.id === source.id) return
    if (source.type === 'file' && !isSucceedFile(source.status)) return
    selectedItem.value = source
    if (source.type === 'file') {
      // if (only_preview) {
      // } else {
      // }
      previewFile.value = source
      selectedFile.value = source
    }
  }
  const lastActive = ref<any>()
  const onActive = (source, only_preview = false) => {
    if (lastActive.value && lastActive.value === source) {
      return
    }
    onSelect(source, only_preview)

    lastActive.value && (lastActive.value._active = false)
    source._active = !source._active
    lastActive.value = source
  }

  const eventEmitter = useEventEmitter()
  const chatStore = useChat({
    isMultiDocumentsMode,
    kbLibraryStore,
    checkedDocuments,
    checkedFolders,
    selectedItem,
    selectedFile,
    historyStateData,
    fileFlatData
  })

  return {
    eventEmitter,
    sidebarSearchVisible,
    init,
    historyStateData,
    showSortTool,
    userFileLoading,
    userFileData,
    fileTreeData,
    userFileMap,
    fileFlatData,
    isPersonalKB,
    isMultiDocumentsMode,
    updateCheckedDocuments,
    selectedItem,
    selectedFile,
    previewFile,
    selectedMultiple,
    selectedAll,
    indeterminate,
    onMultipleChange,
    checkedKeys,
    checkedDocuments,
    getDocumentList,
    addFolder,
    addFile,
    removeFolder,
    removeFile,
    ...useSearch({ kbLibraryStore }),
    ...chatStore,
    ...kbLibraryStore,
    updateFolderSort: updateFolderSort$,
    updateFileSort: updateFileSort$,
    updateFileFolder: updateFileFolder$,
    updateFolderFileSort: updateFolderFileSort$,
    addFileIntoKB,
    handleParsingFileList,
    refreshFileList,
    ...useEditTitle({ userFileData }),
    ...sortStore,
    onSelect,
    onActive
  }
})
