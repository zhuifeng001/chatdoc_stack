import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { message, notification } from 'ant-design-vue'
import { getPublicDocumentByIds } from '~/api'

export const useSelectedDocuments = () => {
  const selectedDocumentModalVisible = ref(false)
  const selectedDocumentVisible = ref(false)

  const selectedDocuments = useLocalStorage('selectedDocuments', [], {
    listenToStorageChanges: true,
    serializer: {
      read: (v: any) => {
        return v ? JSON.parse(v) : []
      },
      write: (v: any) => {
        return JSON.stringify(v)
      }
    }
  })

  const batchAddDocuments = (docList: any[]) => {
    for (const doc of docList) {
      addDocument(doc)
    }

    const FIXED_NUM = 20
    const alreadyExistNum = selectedDocuments.value.length
    if (alreadyExistNum > FIXED_NUM) {
      selectedDocuments.value = selectedDocuments.value.slice(0, FIXED_NUM)
      notification.open({
        message: `友情提示`,
        description: `最多只能添加20个文档`,
        placement: 'topRight',
        icon: () => h(ExclamationCircleOutlined, { style: 'color: orange' }),
        duration: 1.5
      })
    }
  }

  const addDocument = (doc: any) => {
    if (selectedDocuments.value.find(o => o.id === doc.id)) {
      // message.warning(`文档${doc.name}已选择`)
      notification.open({
        message: `友情提示`,
        description: `文档${doc.name}已存在对话列表中`,
        placement: 'topRight',
        icon: () => h(ExclamationCircleOutlined, { style: 'color: orange' }),
        duration: 1.5
      })
      return
    }
    selectedDocuments.value.push(doc)
  }

  const removeDocument = (id: string | number) => {
    const i = selectedDocuments.value.findIndex(o => o.id === id)
    if (i !== -1) {
      selectedDocuments.value.splice(i, 1)
    }
  }

  const resetDocuments = () => {
    selectedDocuments.value = []
  }

  const init = async () => {
    const initialValue = selectedDocuments.value.slice()
    setTimeout(() => {
      selectedDocuments.value = initialValue
    })
  }

  init()

  return {
    selectedDocumentModalVisible,
    selectedDocumentVisible,
    selectedDocuments,
    // selectedDocumentIds,
    addDocument,
    batchAddDocuments,
    removeDocument,
    resetDocuments
  }
}
