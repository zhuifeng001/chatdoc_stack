import { ref } from 'vue'

export const useLockFn = fn => {
  const lock = ref(false)

  const lockFn = async (...args) => {
    if (lock.value) return
    lock.value = true
    try {
      const ret = await fn(...args)
      lock.value = false
      return ret
    } catch (e) {
      lock.value = false
      throw e
    }
  }

  return lockFn
}
