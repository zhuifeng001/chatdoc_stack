import { storeToRefs } from 'pinia'
import { useKBStore } from '../store'
import { reactive } from 'vue'
import { debounce } from 'lodash-es'

export type DragObject = ReturnType<typeof useDrag>

export const useDrag = () => {
  const store = useKBStore()
  const { userFileData } = storeToRefs(store)

  const loopFindParent = (node: HTMLElement | null, group: 'file' | 'folder', count = 0): HTMLElement | null | undefined => {
    if (!node) return node
    if (node.dataset?.group === group) return node
    if (count === 15) return // ! 最大深度限制 15
    return loopFindParent(node.parentElement as HTMLElement, group, count + 1)
  }

  let startNode: HTMLElement | null = null
  let startFolderNode: HTMLElement | null | undefined = null
  let cloneStartNode: HTMLElement | null = null

  let isDragFolder = false
  let isSwapFileAndFolder = false // 是否交换文件和文件夹的位置

  const onDragStart = debounce(
    event => {
      // 拖拽文件， 或者文件夹
      if (!['file', 'folder'].includes(event.target?.dataset.group)) {
        return false
      }
      isDragFolder = event.target?.dataset.group === 'folder'

      startNode = event.target
      startFolderNode = loopFindParent(startNode, 'folder')
      // 设置鼠标拖拽元素的样式
      event.dataTransfer.effectAllowed = 'move'

      // 拖拽文件夹中的文件，设置样式
      if (startNode && startFolderNode && startNode !== startFolderNode) {
        const img = new Image()
        img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' %3E%3Cpath /%3E%3C/svg%3E"
        event.dataTransfer.setDragImage(img, 0, 0)

        cloneStartNode = startNode.cloneNode(true) as HTMLElement
        cloneStartNode.style.position = 'fixed'
        cloneStartNode.style.left = '0'
        cloneStartNode.style.top = '0'
        cloneStartNode.style.width = '233px'
        cloneStartNode.style.zIndex = '99999'
        cloneStartNode.style.pointerEvents = 'none'
        cloneStartNode.style.border = 'none'
        cloneStartNode.style.borderRadius = '4px'
        cloneStartNode.style.transition = 'all 0.1s'
        cloneStartNode.style.background = 'rgba(255, 255, 255, 0.95)'
        cloneStartNode.style.transform = `translate3d(${event.clientX - event.offsetX}px, ${event.clientY - 16}px, 0)`

        document.body.appendChild(cloneStartNode)
      }
    },
    30,
    { leading: true, trailing: false }
  )
  /**
   *! 此处必须阻止默认行为 preventDefault(), 以触发 drop 事件
   */
  const onDragOver = event => {
    event.preventDefault()
    isSwapFileAndFolder = false

    if (!startNode) return
    // if (isDragFolder) return

    if (cloneStartNode) {
      cloneStartNode.style.transform = `translate3d(${event.clientX - 40}px,${event.clientY - 16}px,0)`
    }

    const endNode = loopFindParent(event.target, 'file')
    const endFolderNode = loopFindParent(event.target, 'folder')
    // 目标是文件夹
    if (!endNode) {
      // 前后同一个
      if (startNode === endFolderNode || startFolderNode === endFolderNode) {
        hideDragHoverLine()
        return
      }
      if (endFolderNode && event.target === endFolderNode) {
        hideDragHoverLine()
        displayTargetFolderStyle(endFolderNode)
      }

      // 拖拽文件至文件夹顶部20px范围内，是与文件夹交换位置，其他范围则将文件放至文件夹内
      if (startNode && endFolderNode) {
        const { top } = endFolderNode.getBoundingClientRect()
        // 拖拽的文件夹，直接展示位置标记
        if (isDragFolder || (event.clientY > top && event.clientY < top + 20)) {
          displayDragHoverLine(endFolderNode)
          isSwapFileAndFolder = true
        } else {
          hideDragHoverLine()
        }
      }
    }
    // 目标是文件
    else {
      // 前后同一个或者，将文件夹拖拽到其他文件夹的文件上面
      if (startNode === endNode || (isDragFolder && endFolderNode)) {
        hideDragHoverLine()
        return
      }
      displayDragHoverLine(endNode)
    }
  }
  /**
   *! dragover, dragenter 两个事件在虚拟列表会出现触发失效的问题
   */
  const onDragEnter = event => {
    if (!startNode) return
    event.preventDefault()
  }

  const onDragLeave = event => {
    if (!startNode) return
    event.preventDefault()

    // const endNode = loopFindParent(event.target, 'file')
    // if (!endNode) {
    //   const endFolderNode = loopFindParent(event.target, 'folder')
    //   if (endFolderNode && event.target === endFolderNode) {
    //     hideDragHoverLine()
    //     displayTargetFolderStyle(endFolderNode)
    //   }
    // }
  }

  const onDragEnd = debounce(event => {
    event.preventDefault()
    cloneStartNode && cloneStartNode.parentElement?.removeChild(cloneStartNode)
    cloneStartNode = null
    isDragFolder = false
    hideDragHoverLine()
    hideTargetFolderStyle()
  }, 30)

  const onDrop = event => {
    event.preventDefault()
    if (!startNode) return

    const handle = () => {
      const endNode = loopFindParent(event.target, 'file')
      const endFolderNode = loopFindParent(event.target, 'folder')
      if (!endNode) {
        // 拖拽文件至另外的文件夹
        const startIndex = startNode?.dataset?.index
        const startFolderIndex = startFolderNode?.dataset.index
        if (startIndex == null) return
        const endFolderIndex = endFolderNode?.dataset?.index
        if (endFolderIndex == null) return

        // 更新数据
        const targetFolderItem = userFileData.value[endFolderIndex]
        // 将没有文件夹归属的文件，放置目标文件夹中
        if (startFolderIndex == null) {
          //文件和文件夹交换位置
          if (isSwapFileAndFolder) {
            isSwapFileAndFolder = false
            const oldV = userFileData.value[startIndex]
            const newV = userFileData.value[endFolderIndex]
            userFileData.value[startIndex] = newV
            userFileData.value[endFolderIndex] = oldV
            store.updateFolderFileSort(oldV, newV)
          }
          // 没有文件夹归属的文件，放置目标文件夹中
          else {
            const draggedItem = userFileData.value[startIndex]
            draggedItem.folderId = targetFolderItem.id
            targetFolderItem.children.push(draggedItem)
            userFileData.value.splice(Number(startIndex), 1)
            store.updateFileFolder(draggedItem, targetFolderItem)
          }
        }
        // 仅文件夹交换位置
        else if (isDragFolder) {
          if (startFolderIndex === endFolderIndex) return
          const oldV = userFileData.value[startFolderIndex]
          const newV = userFileData.value[endFolderIndex]
          userFileData.value[startFolderIndex] = newV
          userFileData.value[endFolderIndex] = oldV
          store.updateFolderSort(oldV, newV)
        }
        // 拖拽文件夹中的文件 至 另外的文件夹
        else {
          const startFolderItem = userFileData.value[startFolderIndex]
          const draggedItem = startFolderItem.children[startIndex]
          draggedItem.folderId = targetFolderItem.id
          targetFolderItem.children.push(draggedItem)
          startFolderItem.children.splice(Number(startIndex), 1)
          store.updateFileFolder(draggedItem, targetFolderItem)
        }
      } else {
        // 同一文件夹内的两文件交换位置
        //! 注意包含 null == undefined
        if (startFolderNode == endFolderNode) {
          const startIndex = startNode?.dataset?.index
          const endIndex = endNode?.dataset?.index
          const startFolderIndex = startFolderNode?.dataset.index
          if (startIndex == null || endIndex == null || startIndex === endIndex) return

          // 有目录
          if (startFolderIndex) {
            // 更新数据
            const children = userFileData.value[startFolderIndex]?.children || []
            const oldV = children[startIndex]
            const newV = children[endIndex]
            children[startIndex] = newV
            children[endIndex] = oldV
            userFileData.value[startFolderIndex].children = reactive(children)
            store.updateFileSort(oldV, newV)
          } else {
            // 没有目录
            const oldV = userFileData.value[startIndex]
            const newV = userFileData.value[endIndex]
            userFileData.value[startIndex] = newV
            userFileData.value[endIndex] = oldV
            store.updateFileSort(oldV, newV)
          }
        } else {
          const startIndex = startNode?.dataset?.index
          const startFolderIndex = startFolderNode?.dataset.index
          if (startIndex == null) return
          const endIndex = endNode?.dataset?.index
          const endFolderIndex = endFolderNode?.dataset?.index

          // 拖拽的文件夹，与 文件 交换位置
          if (isDragFolder && startFolderIndex && endIndex) {
            const oldV = userFileData.value[startFolderIndex]
            const newV = userFileData.value[endIndex]
            userFileData.value[startFolderIndex] = newV
            userFileData.value[endIndex] = oldV
            store.updateFolderFileSort(oldV, newV)
          }
          // 将没有文件夹归属的文件，放置目标文件夹中
          else if (startFolderIndex == null && endFolderIndex) {
            const draggedItem = userFileData.value[startIndex]
            const targetFolderItem = userFileData.value[endFolderIndex]
            draggedItem.folderId = targetFolderItem.id
            targetFolderItem.children.push(draggedItem)
            userFileData.value.splice(Number(startIndex), 1)
            store.updateFileFolder(draggedItem, targetFolderItem)
          }
          // 仅文件夹交换位置
          else if (isDragFolder && startFolderIndex && endFolderIndex) {
            if (startFolderIndex === endFolderIndex) return
            const oldV = userFileData.value[startFolderIndex]
            const newV = userFileData.value[endFolderIndex]
            userFileData.value[startFolderIndex] = newV
            userFileData.value[endFolderIndex] = oldV
            store.updateFolderSort(oldV, newV)
          }
          // 拖拽文件夹中的文件 至 另外的文件夹
          else if (startFolderIndex && endFolderIndex) {
            const startFolderItem = userFileData.value[startFolderIndex]
            const targetFolderItem = userFileData.value[endFolderIndex]
            const draggedItem = startFolderItem.children[startIndex]
            draggedItem.folderId = targetFolderItem.id
            targetFolderItem.children.push(draggedItem)
            startFolderItem.children.splice(Number(startIndex), 1)
            store.updateFileFolder(draggedItem, targetFolderItem)
          }
        }
      }
    }
    handle()

    startNode = null
    startFolderNode = null
  }

  return { onDragStart, onDragOver, onDragEnter, onDragLeave, onDragEnd, onDrop }
}

const displayDragHoverLine = (targetNode: HTMLElement) => {
  const container = document.getElementById('KBDocumentList')
  if (!container) return
  if (!container.classList.contains('drag-target-hover')) {
    container.classList.add('drag-target-hover')
  }
  const hoverLine = document.getElementById('DragHoverLine')
  if (!hoverLine) return
  const { left, top, width } = targetNode.getBoundingClientRect()
  hoverLine.style.left = left + 12 + 'px'
  hoverLine.style.top = top - 4 + 'px'
  hoverLine.style.width = width - 12 + 'px'
}

const hideDragHoverLine = () => {
  const container = document.getElementById('KBDocumentList')
  if (!container) return
  if (container.classList.contains('drag-target-hover')) {
    container.classList.remove('drag-target-hover')
  }
}

const displayTargetFolderStyle: any = (targetFolder: HTMLElement) => {
  hideTargetFolderStyle()
  targetFolder.classList.add('drag-target-folder-hover')
  displayTargetFolderStyle.targetFolder = targetFolder
}
const hideTargetFolderStyle = (targetFolder?: HTMLElement) => {
  targetFolder ??= displayTargetFolderStyle.targetFolder
  targetFolder?.classList.remove('drag-target-folder-hover')
  displayTargetFolderStyle.targetFolder = null
}
