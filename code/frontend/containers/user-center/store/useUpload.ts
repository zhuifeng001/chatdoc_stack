export enum UploadTypeEnums {
  SUCCESS = 'success',
  ACTIVE = 'active',
  EXCEPTION = 'exception'
}

export const useUpload = () => {
  const uploadFileList = ref<any[]>([])
  // 计算上传成功数
  const successCount = computed(() => {
    return uploadFileList.value.filter(o => o.status === UploadTypeEnums.SUCCESS).length
  })

  // 计算是否全部上传成功
  const isAllSuccess = computed(() => {
    return successCount.value === uploadFileList.value.length && successCount.value !== 0
  })

  // 计算总上传进度,根据loaded和total
  const totalPercent = computed(() => {
    const totalLoaded = uploadFileList.value.reduce((prev, cur) => {
      return prev + cur.loaded
    }, 0)
    const totalSize = uploadFileList.value.reduce((prev, cur) => {
      return prev + cur.size
    }, 0)
    return totalSize ? +((totalLoaded / totalSize) * 100).toFixed(0) : 0
  })

  return {
    uploadFileList,
    successCount,
    isAllSuccess,
    totalPercent
  }
}
