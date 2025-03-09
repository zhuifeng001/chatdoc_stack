export const storage = Object.freeze({
  store: isClient ? localStorage : undefined,
  getItem(key: string) {
    return storage.store?.getItem(key)
  },
  setItem(key: string, value: string) {
    return storage.store?.setItem(key, value)
  },
  removeItem(key: string) {
    return storage.store?.removeItem(key)
  }
})
