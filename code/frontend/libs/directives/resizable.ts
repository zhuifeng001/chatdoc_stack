const bodyClass = `resizable-cls`
const styleId = 'ResizableStyle'

const styleContent = `.resizable-cls{user-select: none;}`

// 支持上下左右四边拖动。若内部元素太贴边，不易触发拖动事件，最好在拖动一边加边框，使鼠标容易选中。
// 使用方式：
// <div v-resizable="'right, bottom'">
export default {
  install: app => {
    const sideArr = ['right', 'left', 'top', 'bottom']
    const errMsg = 'resizable needs string value of: ' + sideArr
    const minSize = 40
    const dragSize = 10

    app.directive('resizable', {
      mounted(el: HTMLElement, binding) {
        if (!document.head.querySelector(`#${styleId}`)) {
          const styleNode = document.createElement('style')
          styleNode.setAttribute('type', 'text/css')
          styleNode.innerHTML = styleContent
          styleNode.setAttribute('id', styleId)
          document.head.appendChild(styleNode)
        }
        const getArgModifiers = () => {
          const argArr = binding.arg?.split('.')?.filter(Boolean)
          return argArr?.reduce((t, o) => Object.assign(t, { [o]: true }), {})
        }
        const { parent, flex, disabled } = getArgModifiers() || binding.modifiers || {}
        if (disabled) return

        parent && (el = (el.parentElement || el.parentNode) as HTMLElement)
        const draggable = {}
        const oriCur = el.style.cursor
        const sides = binding.value.replace(' ', '').split(',')
        const widthField = flex ? 'flex-basis' : 'width'
        const heightField = flex ? 'flex-basis' : 'height'
        // const widthField = 'width'
        // const heightField = 'height'
        let dragSide = ''
        let dragging = false

        if (sides.length === 0) {
          throw errMsg
        }
        for (let i = 0; i < sides.length; i++) {
          if (sideArr.indexOf(sides[i]) < 0) {
            throw errMsg
          }
          draggable[sides[i]] = true
        }

        el.addEventListener('mousemove', e => {
          if (dragging) return
          const { left, top } = el.getBoundingClientRect()
          const offsetX = Math.round(e.clientX - left)
          const offsetY = Math.round(e.clientY - top)

          if (draggable['right'] && el.offsetWidth - offsetX < dragSize) {
            el.style.cursor = 'col-resize'
            dragSide = 'right'
          } else if (draggable['left'] && offsetX < dragSize) {
            el.style.cursor = 'col-resize'
            dragSide = 'left'
          } else if (draggable['top'] && offsetY < dragSize) {
            el.style.cursor = 'row-resize'
            dragSide = 'top'
          } else if (draggable['bottom'] && el.offsetHeight - offsetY < dragSize) {
            el.style.cursor = 'row-resize'
            dragSide = 'bottom'
          } else {
            el.style.cursor = oriCur
            dragSide = ''
          }
        })

        const getNodeRect = (el: HTMLElement) => {
          if (!el) return { width: 0, height: 0, minWidth: 0, minHeight: 0, maxWidth: 0, maxHeight: 0 }
          if (el.nodeName === '#text')
            return { width: 0, height: 0, minWidth: 0, minHeight: 0, maxWidth: 0, maxHeight: 0 }
          const cStyle = window.getComputedStyle(el)
          let width = Number.parseFloat(cStyle.width)
          let height = Number.parseFloat(cStyle.height)
          width = width > 0 ? width : el.offsetWidth
          height = height > 0 ? height : el.offsetHeight
          const minWidth = Number.parseFloat(cStyle.minWidth) || 0
          const minHeight = Number.parseFloat(cStyle.minHeight) || 0
          const maxWidth = Number.parseFloat(cStyle.maxWidth) || Infinity
          const maxHeight = Number.parseFloat(cStyle.maxHeight) || Infinity
          return { width, height, minWidth, minHeight, maxWidth, maxHeight }
        }

        // TODO mousemove 遇到 iframe 会失效，添加浮层
        const createIframeCover = () => {}

        el.addEventListener('mousedown', e => {
          if (!dragSide) return
          dragging = true
          const { width: elW, height: elH, minWidth: elMinW, minHeight: elMinH } = getNodeRect(el)
          const prevEl = (el.previousElementSibling || el.previousSibling) as HTMLElement
          const { width: prevElW, height: prevElH, minWidth: prevMinW, minHeight: prevMinH } = getNodeRect(prevEl)
          const nextEl = (el.nextElementSibling || el.nextSibling) as HTMLElement
          const { width: nextElW, height: nextElH, minWidth: nextMinW, minHeight: nextMinH } = getNodeRect(nextEl)
          const clientX = e.clientX
          const clientY = e.clientY

          const moveFn = e => {
            e.preventDefault()
            document.body.classList.add(bodyClass)
            if (dragSide === 'right' && (e.clientX > clientX || el.offsetWidth >= minSize)) {
              let diff = e.clientX - clientX
              if (elW + diff < elMinW) {
                diff = -Math.max(0, elW - elMinW)
              } else if (nextEl && nextElW - diff < nextMinW) {
                diff = Math.max(0, nextElW - nextMinW)
              }
              el.style[widthField] = elW + diff + 'px'
              nextEl && (nextEl.style[widthField] = nextElW - diff + 'px')
            } else if (dragSide === 'left' && (e.clientX < clientX || el.offsetWidth >= minSize)) {
              let diff = clientX - e.clientX
              if (elW + diff < elMinW) {
                diff = -Math.max(0, elW - elMinW)
              } else if (prevEl && prevElW - diff < prevMinW) {
                diff = Math.max(0, prevElW - prevMinW)
              }
              el.style[widthField] = elW + diff + 'px'
              prevEl && (prevEl.style[widthField] = prevElW - diff + 'px')
            } else if (dragSide === 'top' && (e.clientY < clientY || el.offsetHeight >= minSize)) {
              let diff = clientY - e.clientY
              if (elH + diff < elMinH) {
                diff = -Math.max(0, elH - elMinH)
              } else if (prevEl && prevElH - diff < prevMinH) {
                diff = Math.max(0, prevElH - prevMinH)
              }
              el.style[heightField] = elH + diff + 'px'
              prevEl && (prevEl.style[heightField] = prevElH - diff + 'px')
            } else if (dragSide === 'bottom' && (e.clientY > clientY || el.offsetHeight >= minSize)) {
              let diff = e.clientY - clientY
              if (elH + diff < elMinH) {
                diff = -Math.max(0, elH - elMinH)
              } else if (nextEl && nextElH - diff < nextMinH) {
                diff = Math.max(0, nextElH - nextMinH)
              }
              el.style[heightField] = elH + diff + 'px'
              nextEl && (nextEl.style[heightField] = nextElH - diff + 'px')
            }
          }

          const removeFn = () => {
            document.body.classList.remove(bodyClass)
            dragging = false
            document.removeEventListener('mousemove', moveFn)
            document.removeEventListener('mouseup', removeFn)
          }
          document.addEventListener('mousemove', moveFn)
          document.addEventListener('mouseup', removeFn)
        })
      },
      unmounted() {
        // TODO destroy events
      }
    })
  }
}
