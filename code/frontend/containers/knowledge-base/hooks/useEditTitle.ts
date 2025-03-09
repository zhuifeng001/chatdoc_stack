import { nextTick, ref, type Ref } from 'vue'
import type { UserFileData } from '../types'
import { updateUserFolder, updateUserFile } from '@/api/knowledge-base'
import { KB_FOLDER_ID } from '../store/helper'
import { message } from 'ant-design-vue'

export const useEditTitle = (props: { userFileData: Ref<UserFileData[]> }) => {
  const { userFileData } = props
  const openEditTitle = async (source: UserFileData, event?: any) => {
    event?.stopPropagation()

    if (source.type !== 'kb' && source.folderId !== KB_FOLDER_ID) {
      source._title = source.title
      source._edit = true
      await nextTick()
      document.getElementById(`${source.type}${source.id}`)?.focus()
    }
  }

  const isEditTitle = ref(false)
  const closeEditTitle = (source: UserFileData) => {
    if (isEditTitle.value) return

    if (source.title === source._title) {
      source._edit = false
      return
    }
    if (!source.title) {
      source.title = source._title as string
      source._edit = false
      return false
    }
    if (isExistTitle(source)) {
      source.title = source._title as string
      message.warn('名称已存在')
      return false
    }

    isEditTitle.value = true
    const api = source.type === 'folder' ? updateUserFolder : updateUserFile
    api({
      id: source.id,
      name: source.title
    })
      .then(() => {
        source._edit = false
        source._title = source.title
      })
      .catch(() => {
        source.title = source._title as string
      })
      .finally(() => {
        isEditTitle.value = false
      })
  }

  const isExistTitle = (source: UserFileData) => {
    return userFileData.value.some(o => {
      if (o._id !== source._id && o.title === source.title) {
        return true
      }
      if ('children' in o) {
        return o.children?.some(p => p._id !== source._id && p.title === source.title)
      }
    })
  }

  return { openEditTitle, closeEditTitle }
}
