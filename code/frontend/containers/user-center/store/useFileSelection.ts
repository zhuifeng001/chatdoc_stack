export const useFileSElection = ({ dataList }: { dataList: Ref<any[]> }) => {
  const pageChecked = ref(false)
  const pageCheckedIndeterminate = ref(false)
  /**
   * 开启批量选择
   */
  const openBatch = ref(true)

  const getFoldersAndFiles = () => {
    const checkedItems = dataList.value.filter(o => o._checked)
    const folderIds = checkedItems.filter(o => o._type === 'folder').map(o => o.id)
    const ids = checkedItems.filter(o => o._type === 'file').map(o => o.id)
    return {
      folderIds: folderIds.length ? folderIds : undefined,
      ids: ids.length ? ids : undefined
    }
  }

  watch(pageChecked, () => {
    dataList.value.forEach(o => {
      o._checked = pageChecked.value
    })
  })

  // 全部取消选中
  watch(
    () => dataList.value?.length && dataList.value?.every(o => !o._checked),
    v => {
      if (v) {
        pageChecked.value = false
      }
    }
  )
  // 全部选中
  watch(
    () => dataList.value?.length && dataList.value?.every(o => o._checked),
    v => {
      if (v) {
        pageChecked.value = true
      }
    }
  )
  // 部分选中
  watch(
    () => dataList.value?.some(o => o._checked) && dataList.value?.some(o => !o._checked),
    v => {
      pageCheckedIndeterminate.value = v
    }
  )

  return {
    openBatch,
    pageChecked,
    pageCheckedIndeterminate,
    getFoldersAndFiles
  }
}
