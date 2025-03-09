export type Pos = {
  id?: string
  page: number
  line: number
  retrieval_index: number
  firstPage?: number
  lines?: Pos[]
  _rendered?: boolean
  reference_tag: string
  uuid: string
}

export enum GlobalQATypeEnums {
  DOCUMENT = 'document',
  GLOBAL = 'global',
  ANALYST = 'analyst',
  PERSONAL = 'personal'
}

export enum GlobalQATypeNumberEnums {
  DOCUMENT = 0,
  GLOBAL = 1,
  ANALYST = 2,
  PERSONAL = 3
}

export const QATypeMap = new Map([
  [GlobalQATypeNumberEnums.DOCUMENT, GlobalQATypeEnums.DOCUMENT],
  [GlobalQATypeNumberEnums.ANALYST, GlobalQATypeEnums.ANALYST],
  [GlobalQATypeNumberEnums.PERSONAL, GlobalQATypeEnums.PERSONAL],
  [GlobalQATypeNumberEnums.GLOBAL, GlobalQATypeEnums.GLOBAL]
])

export const GlobalQATypeOptions = [
  // {
  //   label: '全局',
  //   value: GlobalQATypeEnums.GLOBAL
  // },
  // {
  //   label: '公开知识库',
  //   value: GlobalQATypeEnums.ANALYST
  // },
  {
    label: '个人知识库',
    value: GlobalQATypeEnums.PERSONAL
  }
]
