const useWebCache = () => {
  // 缓存数据, 默认十分钟
  function cacheData(key, value, ttl = 1000 * 60 * 10) {
    if (!isClient) return
    const now = new Date().getTime()
    const item = {
      value: value,
      expires: now + ttl // 过期时间等于当前时间加上生存时间
    }
    localStorage.setItem(key, JSON.stringify(item))
  }

  // 获取缓存数据
  function getCachedData(key) {
    if (!isClient) return
    const itemStr = localStorage.getItem(key)
    if (!itemStr) return null // 如果没有找到数据则返回 null

    const item = JSON.parse(itemStr)
    const now = new Date().getTime()

    // 如果数据已经过期
    if (now > item.expires) {
      localStorage.removeItem(key) // 清除过期的数据
      return
    }

    return item.value
  }

  function has(key: string) {
    if (!isClient) return
    return !!localStorage.getItem(key)
  }

  function remove(key) {
    if (!isClient) return
    return localStorage.removeItem(key)
  }

  return {
    set: cacheData,
    get: getCachedData,
    remove,
    has
  }
}

// declare global {
//   interface Window {
//     globalWebCache: ReturnType<typeof useWebCache>
//   }
// }

export const globalWebCache = useWebCache()
// window.globalWebCache = globalWebCache
