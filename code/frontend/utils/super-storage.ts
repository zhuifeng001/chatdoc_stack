import localforage from 'localforage'

const createStore = () => {
  const store = localforage.createInstance({
    name: 'intfinq',
    driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE]
  })
  return store
}

export const superStorage = Object.freeze({
  store: isClient ? createStore() : undefined,
  getItem(key: string) {
    return superStorage.store?.getItem<any>(key)
  },
  setItem(key: string, value: any) {
    return superStorage.store?.setItem<any>(key, value)
  },
  removeItem(key: string) {
    return superStorage.store?.removeItem(key)
  }
})
