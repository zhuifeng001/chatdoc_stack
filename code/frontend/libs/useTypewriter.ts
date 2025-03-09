// import 'prismjs/themes/prism.min.css'
// import 'prismjs/themes/prism-tomorrow.min.css'
// import 'prismjs/themes/prism-twilight.min.css'
// import 'prismjs/themes/prism-okaidia.min.css'
// import 'prismjs/themes/prism-funky.min.css'
// import 'prismjs/themes/prism-dark.min.css'
// import 'prismjs/themes/prism-coy.min.css'

export type UnPromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never
export type Typewriter = UnPromise<ReturnType<typeof useTypewriter>>

type TypewriterOptions = {
  selector: string | HTMLElement
  parentSelector?: string | HTMLElement
  md?: boolean
  speed?: number
  string?: string
  immediate?: boolean
  random?: boolean
  markerStyles?: Record<string, string | number> | false
  autoScroll?: boolean
  insertContent?: (delta: string, content: string) => void
  onFinish?: () => void
  formatString?: (str: string) => string
}

const KatexCssLinkId = 'KatexCssLink'

type WriteOptions = {
  value: string
  step: number
}

// 文本处理
const formatContentString = (str: string) => {
  return (
    str
      // 正则匹配链接 https://www.baidu.com
      .replace(/http(?:s)?:\/\/[\\/\\.\w\d\-_#?=&]+/g, $1 => {
        return `<a href="${$1}">${$1}</a>`
      })
      // 正则匹配链接 www.baidu.com， 排除前面是 https://
      .replace(/(?<!\/\/)www\.[\\/\\.\w\d\-_#?=&]+/g, $1 => {
        return `<a href="https://${$1}">${$1}</a>`
      })
      // 表格之间多个换行符
      .replace(/\|\n{2,}\|/g, '|\n|')
      // 换行符
      .replace(/\n{2,}/g, '\n\n&nbsp;\n\n')
  )
}

export const initMarked = async () => {
  if ((initMarked as any).cache) {
    return (initMarked as any).cache
  }
  const marked = (await import('marked')).marked
  const markedKatex = (await import('marked-katex-extension')).default
  marked.use(
    markedKatex({
      throwOnError: true,
      displayMode: false,
      output: 'html',
      leqno: true,
      globalGroup: true
    })
  )
  const DOMPurify = (await import('dompurify')).default
  const Prism = (await import('prismjs')).default
  Prism.manual = true

  await import('prismjs/themes/prism-solarizedlight.min.css')
  await Promise.all([
    import('prismjs/plugins/toolbar/prism-toolbar.min.js'),
    import('prismjs/plugins/toolbar/prism-toolbar.min.css'),
    import('prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard.min.js'),
    import('prismjs/plugins/show-language/prism-show-language.min.js'),
    import('prismjs/plugins/line-numbers/prism-line-numbers.min.js'),
    import('prismjs/plugins/line-numbers/prism-line-numbers.min.css')
  ])

  // const createKatexCss = () => {
  //   useIdlePromise(() => {
  //     if (document.head.getElementsByClassName(KatexCssLinkId).length) return
  //     const link = document.createElement('link')
  //     link.className = KatexCssLinkId
  //     link.rel = 'stylesheet'
  //     link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css'
  //     link.integrity = 'sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+'
  //     link.crossOrigin = 'anonymous'
  //     document.head.appendChild(link)
  //   })
  // }
  // createKatexCss()

  // 创建一个自定义渲染器
  const renderer = new marked.Renderer()
  // 重写表格渲染方法，将表格用 <div> 包裹
  const originTableRender = renderer.table.bind(renderer)
  renderer.table = token => {
    let tableStr = ''
    try {
      tableStr = originTableRender(token)
    } catch (e) {
      console.log('table error :>> ', e)
      tableStr = token.raw
    }
    console.log('tableStr :>> ', tableStr)
    return `<div class="chat-answer-table">${tableStr}</div>`
  }
  // 将自定义渲染器传递给 marked
  const markedOptions = {
    renderer: renderer
  }

  const cache = {
    marked,
    DOMPurify,
    Prism,
    markedOptions
  }
  ;(initMarked as any).cache = cache
  return cache
}

export const transformMd2HTML = (str: string, { marked, DOMPurify, Prism, markedOptions }) => {
  // format code 表格
  const matchTableCode = str.match(/```(.*?(\|\-\|\-\|).*?)```/gs)
  if (matchTableCode?.length) {
    matchTableCode.forEach(code => {
      const table = code.replace(/```/g, '')
      str = str.replace(code, table)
    })
  }
  // 支持公式
  return DOMPurify.sanitize(marked.parse(str.replace(/\\[\[\]\(\)]/gs, ` $$ `), markedOptions))
}

export const useTypewriter = async (options: TypewriterOptions) => {
  let container = getNode(options.selector)
  if (!container) {
    throw new Error(`找不到响应的容器`)
  }
  const parent = options.parentSelector ? getNode(options.parentSelector) : getParent(container!)
  if (!parent) {
    throw new Error(`找不到响应的父容器`)
  }

  const libs = await initMarked()
  const { marked, Prism, DOMPurify } = libs

  const parentRect = parent?.getBoundingClientRect()

  const { speed = 50, string = '', autoScroll = false, immediate = false, random = false } = options

  options.formatString ??= formatContentString

  let writerStr = ''

  const noMark = options.markerStyles === false
  !noMark && setMarkStyle(options.markerStyles as Record<string, string>)
  let marker: HTMLElement | null = noMark ? null : createMarker(parent)

  let scroll = autoScroll
  const setAutoScroll = (val: boolean) => {
    scroll = val
  }
  const setScroll = () => {
    if (scroll && parent.scrollTop + parent.clientHeight < parent.scrollHeight) {
      // parent.scrollTop = container!.scrollHeight
      marker?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const highlightHTML = () => {
    container?.querySelectorAll('pre').forEach((el: HTMLElement) => {
      let hasLanguage = false
      el.classList.forEach((c: string) => (hasLanguage = c.startsWith('language-')))
      !hasLanguage && el.classList.add('language-plain')
      el.classList.add('line-numbers')
      el.setAttribute('data-prismjs-copy', '复制')
      el.setAttribute('data-prismjs-copy-success', '已复制')
      el.setAttribute('data-prismjs-copy-timeout', '2000')
    })
    Prism.highlightAll()
  }

  const updateMarker = (blink?: boolean) => {
    const parentRect = parent?.getBoundingClientRect()
    if (!container || !marker || !parentRect) return
    // 获取光标位置
    const lastChild = getLastTextNode(container)
    const rect = getTextNodeRect(lastChild)
    marker.style.left = rect.right - parentRect.left + parent.scrollLeft + 'px'
    marker.style.top = rect.top - parentRect.top + parent.scrollTop + 'px'
    marker.style.width = rect.height / 4 + 'px'
    marker.style.height = rect.height + 'px'

    if (blink) {
      marker.style.animation = 'blink 0.8s infinite'
    }

    // TODO width height 可能存在都为0的情况，需要排查
    if (!rect.width && !rect.height) {
      marker.style.display = 'none'
    } else {
      marker.style.display = 'inline-block'
    }
    // marker?.scrollIntoView({ block: 'nearest' })
  }

  const startMarker = ({ left = 0, top = 0, blink = true }: { left?: number; top?: number; blink?: boolean } = {}) => {
    if (!container || !marker || !parent) return
    const parentRect = parent?.getBoundingClientRect()
    const rect = container.getBoundingClientRect()
    const containerStyle = getComputedStyle(container)
    marker.style.left =
      rect.left - parentRect.left + parent.scrollLeft + parseFloat(containerStyle.paddingLeft) + left + 'px'
    marker.style.top = rect.top - parentRect.top + parent.scrollTop + top + 'px'
    marker.style.width = rect.height / 4 + 'px'
    marker.style.height = rect.height + 'px'
    marker.style.display = 'inline-block'
    if (blink) {
      marker.style.animation = 'blink 0.8s infinite'
    }
  }

  let prevIndex = 0
  const _write_char = (i: number) => {
    if (forceFinished.value) return
    if (!container) {
      return
    }

    finishByTimeout()
    const delta = writerStr.slice(prevIndex, i)
    prevIndex = i
    const temp = writerStr.slice(0, i)

    const formattedStr = options.formatString ? options.formatString(temp) : temp
    const content = options.md //
      ? transformMd2HTML(formattedStr, libs)
      : formattedStr
    options.insertContent ? options.insertContent(delta, content) : (container.innerHTML = content)

    highlightHTML()

    updateMarker(i === 0 || i === writerStr.length - 1)

    setScroll()
  }

  const start = async (i: number, currentTotal: number, step = 1) => {
    if (forceFinished.value) return

    if (!container) {
      return
    }

    _write_char(i)

    // 双层枷锁，调用一次finish
    if (!isEmitFinished.value && externalFinishStatus.value && !writingStack.length && i >= currentTotal) {
      console.log('run finish')
      finish()
      return
    }

    const execute = () => {
      if (i < currentTotal) {
        return start(i + step, currentTotal)
      } else {
        return true
      }
    }

    if (!speed) {
      return execute()
    }

    return new Promise(resolve => {
      setTimeout(
        () => {
          if (i < currentTotal) {
            resolve(start(i + step, currentTotal))
          } else {
            resolve(true)
          }
        },
        random ? speed * Math.random() : speed
      )
    })
  }

  const writingStack: WriteOptions[] = []
  let writingStatus = false
  const writeByStack = async (timestamp = +Date.now()) => {
    if (!writingStack.length) {
      writingStatus = false
      return
    }
    writingStatus = true
    const v = writingStack.shift() as WriteOptions
    await _write(v.value, v.step)
    writeByStack(timestamp)
  }

  const print = (str: string, step = 1) => {
    if (forceFinished.value) return
    if (!str) return
    writingStack.push({ value: str, step })
    if (!writingStatus) {
      writeByStack()
    }
  }

  const _write = (str: string, step = 1) => {
    const startIndex = writerStr.length
    writerStr += str
    return start(immediate ? str.length : startIndex, writerStr.length, step)
  }

  const rewrite = async (str: string) => {
    writerStr = str
    await start(str.length, writerStr.length)
    finish(false)
  }

  const isEmitFinished = { value: false }
  const finish = (emit = true) => {
    if (timeoutTimer.value) {
      clearTimeout(timeoutTimer.value)
    }

    if (marker) {
      marker.style.display = 'none'
    }

    writingStatus = false

    if (emit) {
      if (isEmitFinished.value) return
      isEmitFinished.value = true

      options.onFinish?.()
    }
  }

  const timeoutTimer = { value: null as any }
  const finishByTimeout = () => {
    if (timeoutTimer.value) {
      clearTimeout(timeoutTimer.value)
    }
    timeoutTimer.value = setTimeout(() => {
      if (!isEmitFinished.value) {
        console.log('timeout finish')
      }
      finish()
    }, 8000) // ! timeout 时间
  }

  const reset = () => {
    prevIndex = 0
    writerStr = ''
    externalFinishStatus.value = false
    writingStatus = false
    forceFinished.value = false
    isEmitFinished.value = false
  }

  const destroy = () => {
    reset()
    container = null
    marker?.remove()
    marker = null
  }

  const init = async () => {
    // 初始化参数中配置文本，立即写入
    if (string) {
      await _write(string)
      finish()
    }
  }

  // 外部输出完成状态
  const externalFinishStatus = { value: false }
  // 外部流式输出完毕，可能还在打印中
  const notifyFinished = () => {
    externalFinishStatus.value = true
    if (!isEmitFinished.value && !writingStack.length && !writingStatus) {
      finish()
    }
  }

  // 强制停止
  const forceFinished = { value: false }
  const immediateFinished = () => {
    forceFinished.value = true
    finish(false)
  }

  const instance = {
    start: startMarker,
    write: _write,
    reset,
    destroy,
    setAutoScroll,
    print,
    rewrite,
    finish,
    notifyFinished,
    immediateFinished
  }

  init()

  return instance
}

const getNode = (selector: string | HTMLElement): HTMLElement | null => {
  return typeof selector === 'string' ? document.querySelector(selector) : selector
}

const getParent = (node: HTMLElement) => (node.parentElement || node.parentNode) as HTMLElement | null

const getLastTextNode = (node: HTMLElement): HTMLElement => {
  if (!node) return node
  if (node.nodeName === '#text') return node

  // 表格处理
  if (node.nodeName === 'TR') {
    if (node.childNodes?.length) {
      for (let i = node.childNodes.length - 1; i >= 0; i--) {
        const td = node.childNodes[i]
        let lastChild = td.childNodes[td.childNodes.length - 1] as HTMLElement
        if (!lastChild) continue

        if (lastChild.nodeName === '#text' && lastChild.nodeValue === '\n') {
          lastChild = td.childNodes[td.childNodes.length - 2] as HTMLElement
        }
        if ((lastChild = getLastTextNode(lastChild))) {
          return lastChild
        }
      }
      return getLastTextNode(node.childNodes[0] as HTMLElement)
    }
  }

  if (node.childNodes?.length) {
    // 高亮模块
    if (node.nodeName === 'DIV' && node.classList.contains('code-toolbar')) {
      return getLastTextNode(node.childNodes[0] as HTMLElement)
    }

    // marked 解析后处理 （忽略最后一个换行符）
    let lastChild = node.childNodes[node.childNodes.length - 1] as HTMLElement
    if (lastChild && lastChild.nodeName === '#text' && lastChild.nodeValue === '\n') {
      lastChild = node.childNodes[node.childNodes.length - 2] as HTMLElement
    }

    // 代码块
    if (node.nodeName === 'CODE' && lastChild?.classList?.contains('line-numbers-rows')) {
      lastChild = node.childNodes[node.childNodes.length - 2] as HTMLElement
    }

    if (lastChild) return getLastTextNode(lastChild as HTMLElement)
  }
  return node
}

function getTextNodeRect(textNode: Node) {
  const range = document.createRange()
  // range.selectNodeContents(textNode)
  if (textNode.nodeValue?.length) {
    range.setStart(textNode, Math.max(0, textNode.nodeValue.length - 1))
    range.setEnd(textNode, textNode.nodeValue.length)
  }
  return range.getBoundingClientRect()
}

const createMarker = (parent: HTMLElement = document.body) => {
  const marker = document.createElement('span')
  marker.classList.add('typewriter-marker')
  marker.style.display = 'none'
  parent.appendChild(marker)
  return marker
}

const setMarkStyle = (styles?: Record<string, string | number>) => {
  const style = document.createElement('style')
  style.setAttribute('type', 'text/css')
  style.setAttribute('data-style-id', String(+new Date()))
  const styleStr = styles
    ? Object.keys(styles)
        .map(key => `${key}: ${styles[key]}`)
        .join(';')
    : ''
  style.innerHTML = `
.typewriter-marker {
  position: absolute;
  left: 0;
  top: 0;
  display: inline-block;
  font-size: 20px;
  width: 5px;
  height: 20px;
  background-color: #000;
  overflow: hidden;
  vertical-align: sub;
  pointer-events: none;
  z-index: 1;
  ${styleStr}
}

@keyframes blink {
  50% {
    background-color: transparent;
  }
}
`
  // 50% {
  //   background-color: transparent;
  // }

  document.head.appendChild(style)
  return style
}

const escapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

function escapeForHTML(input) {
  return input.replace(/([&<>'"])/g, char => escapeMap[char])
}
