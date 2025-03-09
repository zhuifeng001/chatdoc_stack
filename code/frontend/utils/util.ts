import type { Func } from '@/types'
import { debounce, throttle } from 'lodash-es'
import { isArray, isObject } from './type'

/**
 * 异步延迟执行
 */
export const delay = (duration = 0) => new Promise(resolve => setTimeout(resolve, duration))

type ResizeObserverOptions = {
  throttle?: number
  debounce?: number
  enableFrame?: boolean
}

/**
 * 监听 dom节点尺寸变化
 */
export const useResizeListener = (
  selector: string | Element,
  callback: Func,
  options: ResizeObserverOptions = { throttle: 100, enableFrame: false }
) => {
  // 选择需要观察变动的节点
  let targetNode = selector as Element
  if (typeof selector === 'string') {
    targetNode = document.querySelector(selector) as HTMLElement
  }

  if (!targetNode) return

  const { throttle: throttleTime, debounce: debounceTime } = options

  const observerFunc = function (entries, observer) {
    for (const entry of entries) {
      callback(entry)
    }
  }

  // 当观察到变动时执行的回调函数
  let fn = observerFunc
  if (options.enableFrame) {
    fn = (...args) => {
      window.requestAnimationFrame(() => observerFunc(...args))
    }
  } else if (throttleTime != null) {
    fn = throttle(observerFunc, throttleTime, { leading: true, trailing: true })
  } else if (debounceTime != null) {
    fn = debounce(observerFunc, debounceTime, { leading: true, trailing: true })
  }

  // 创建一个观察器实例并传入回调函数
  const observer = new ResizeObserver(fn)

  // 以上述配置开始观察目标节点
  observer.observe(targetNode)

  return function destroy() {
    observer.disconnect()
  }
}

/**
 * 滚动列表，切换页，通用滚动监听逻辑
 * @returns
 */
export const scrollChangePage = (
  containerNode: HTMLElement,
  listNode: HTMLElement | HTMLCollection,
  { distance } = {} as any
) => {
  if (!containerNode || !listNode) return

  const { height: containerHeight, top: containerTop, bottom: containerBottom } = containerNode.getBoundingClientRect()
  const { scrollTop, scrollHeight } = containerNode

  const itemNodes = listNode instanceof HTMLCollection ? listNode : listNode.children // 默认查找下一级的children
  if (!itemNodes) return

  let activeNode: Element | undefined
  if (distance == null) {
    distance = containerHeight / 2
  }

  if (scrollTop === 0) {
    // 滚动条到达顶部
    activeNode = itemNodes[0]
  } else if (scrollHeight - scrollTop === containerHeight) {
    // 滚动条到达底部
    activeNode = itemNodes[itemNodes.length - 1]
  } else {
    const nodes = [...itemNodes]
    for (const itemNode of nodes) {
      const { top, bottom } = itemNode.getBoundingClientRect()
      if (top - containerTop >= 0 && top - containerTop < distance) {
        // 下一页
        activeNode = itemNode
        break
      } else if (containerBottom - bottom >= 0 && containerBottom - bottom < distance) {
        // 上一页
        activeNode = itemNode
        break
      }
    }
  }
  return activeNode
}

export const scrollToDom = (dom?: Element | Element[] | null, options?: boolean | ScrollIntoViewOptions) => {
  if (!dom) return
  const node = (length in dom ? dom[0] : dom) as Element
  if (!node) return
  node.scrollIntoView(options || { block: 'nearest' })
}

// 判断是否有滚动条
export function hasScrolled(element, direction: 'vertical' | 'horizontal' = 'vertical') {
  if (typeof element === 'string') {
    element = document.querySelector(element)
  }

  if (direction === 'vertical') {
    return element.scrollHeight > element.clientHeight
  } else if (direction === 'horizontal') {
    return element.scrollWidth > element.clientWidth
  }
}

export const useSetTimeoutPromise = (fn, duration = 0, ...args) => {
  return new Promise(resolve => {
    setTimeout(async () => {
      const res = await fn(...args)
      resolve(res)
    }, duration)
  })
}
export const useIdlePromise = (fn, ...args) => {
  let timer: NodeJS.Timeout | null = null

  const execute = resolve => {
    requestIdleCallback(async deadline => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
        const res = await fn(...args)
        resolve(res)
        return
      }
      timer = setTimeout(() => {
        execute(resolve)
      }, 30)
    })
  }
  return new Promise(resolve => execute(resolve))
}

export const useAnimationFramePromise = (fn, ...args) => {
  return new Promise(resolve => {
    requestAnimationFrame(async () => {
      const res = await fn(...args)
      resolve(res)
    })
  })
}

export const deepRemovePrivateProp = <T = Record<string, any>>(obj: T) => {
  if (!isObject(obj)) return obj

  for (const key in obj) {
    if (key.startsWith('_')) {
      delete obj[key]
      continue
    }
    if (isArray(obj[key])) {
      for (const item of obj[key] as Iterable<T>) {
        deepRemovePrivateProp(item)
      }
    } else if (isObject(obj[key])) {
      deepRemovePrivateProp(obj[key])
    }
  }
  return obj
}

/**
 * 比对两个对象
 * 不等返回false，相等返回true
 * @param obj1
 * @param obj2
 * @returns
 */
export const deepEqual = (obj1, obj2) => {
  // 检查对象类型
  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return obj1 === obj2
  }

  if ((isArray(obj1) && !isArray(obj2)) || (!isArray(obj1) && isArray(obj2))) {
    return false
  }

  if (isArray(obj1) && isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      return false
    }
    return obj1.every((item, index) => deepEqual(item, obj2[index]))
  }

  // 获取对象的属性
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  // FIXME: 存在对象中的value为undefined, 导致key的数量不一样
  // 检查属性数量
  // if (keys1.length !== keys2.length) {
  // 	return false;
  // }

  const keys = new Set([...keys1, ...keys2])

  // 递归比较属性值
  for (const key of keys) {
    if (!deepEqual(obj1[key], obj2[key])) {
      return false
    }
  }

  return true
}
