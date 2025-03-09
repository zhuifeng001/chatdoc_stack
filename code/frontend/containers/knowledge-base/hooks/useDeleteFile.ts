import { deleteUserFolder, deleteUserFile } from '@/api/knowledge-base'
import { Modal } from 'ant-design-vue'
import { createVNode } from 'vue'
import type { UserFile, UserFileData } from '../types'
import { storeToRefs } from 'pinia'
import { useKBStore } from '../store'

export const useDeleteFile = () => {
  const store = useKBStore()

  const onDeleteFolderOrFile = (source: UserFileData) => {
    Modal.confirm({
      title: createVNode('div', {}, [
        `确认删除${source.type === 'folder' ? '文件夹' : '文件'} `,
        createVNode('span', { style: 'color: var(--primary-color)' }, [source.title]),
        ` 吗`
      ]),
      content: '删除后不可逆转',
      okText: '确认',
      cancelText: '取消',
      onOk() {
        if (source.type === 'folder') store.removeFolder(source)
        else if (source.type === 'file') store.removeFile(source)
      }
    })
  }

  return { onDeleteFolderOrFile }
}
