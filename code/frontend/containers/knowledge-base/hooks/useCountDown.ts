import { ref } from 'vue'
import { useIntervalFn } from '@vueuse/core'

export const useCountDown = () => {
  const count = ref(0)

  const { resume, pause, isActive } = useIntervalFn(
    () => {
      count.value--
      if (count.value === 0) {
        pause()
      }
    },
    1000,
    { immediate: false }
  )

  const start = (startTime = 60) => {
    if (isActive.value) return
    count.value = startTime
    resume()
  }

  return { count, resume, pause, isActive, start }
}
