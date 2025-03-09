export const useRowSize = () => {
  const vm = getCurrentInstance()?.proxy as any

  const size = ref()

  onMounted(() => {
    size.value = useElementSize(vm.$el)
  })
  const row = computed(() => {
    if (!size.value) return 5
    if (size.value.width < 550) {
      return 3
    } else if (size.value.width < 750) {
      return 3
    } else if (size.value.width < 950) {
      return 3
    } else if (size.value.width < 1150) {
      return 4
    }
    return 5
  })

  onBeforeMount(() => {
    size.value = undefined
  })

  return {
    row
  }
}
