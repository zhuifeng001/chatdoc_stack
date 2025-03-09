import { DocHandleParams } from '../dto/document.dto';

export enum DocumentVisibilityEnums {
  VISIBLE = 1,
  HIDDEN = 0,
}
export enum DocumentStatus {
  'uploaded' = 0,
  'docparser' = 10,
  'catalog' = 20,
  'success' = 30,
  'error' = -1,
}

export enum ChatDocDocumentStatus {
  'uploaded' = 1,
  'docparser' = 2,
  'catalog' = 3,
  'success' = 4,
  'summary' = 5,
  'error' = -1,
}

export const DocumentStatusMap = {
  [ChatDocDocumentStatus.uploaded]: DocumentStatus.uploaded,
  [ChatDocDocumentStatus.docparser]: DocumentStatus.docparser,
  [ChatDocDocumentStatus.catalog]: DocumentStatus.catalog,
  [ChatDocDocumentStatus.success]: DocumentStatus.success,
  [ChatDocDocumentStatus.summary]: DocumentStatus.success,
  [ChatDocDocumentStatus.error]: DocumentStatus.error,
};

export const DocumentStatusLabel = {
  [DocumentStatus.uploaded]: '上传完成',
  [DocumentStatus.docparser]: 'docparser解析成功',
  [DocumentStatus.catalog]: '目录解析成功',
  [DocumentStatus.success]: '成功',
  [DocumentStatus.error]: '失败',
};

export enum DocumentType {
  'library' = 0,
  'user' = 1,
}

export interface IFianDocument {
  name: string;
  libraryId: number;
  folderId?: number;
  extraData?: IExtraData;
  updateBy: number;
  type: DocumentType;
  sort?: number;
  documentSize?: number;
}

export interface ICreateDocument {
  libraryId?: number;
  folderId?: number;
  userId: number;
  filename: string;
  type: DocumentType;
  documentSize: number;
}

export enum DownloadEnum {
  'source' = 'source',
  'imageList' = 'imageList',
  'docparser' = 'docparser',
  'catalog' = 'catalog',
  'merge' = 'merge',
  'brief' = 'brief',
}

export interface IParserParams extends IFianDocument {
  uuid: string;
  force_doc_parse?: boolean;
}

export enum SortTypeEnum {
  'folder' = 'folder',
  'document' = 'document',
}

export interface SaveParams {
  unique?: boolean;
  type?: DocumentType;
  userId?: number;
  extraHandle?: () => Promise<{ [key: string]: unknown }>;
  fileType?: string;
  handleParams?: DocHandleParams;
}

// 文档扩展字段
export interface IExtraData {
  [key: string]: unknown;
  company?: string; // 财报公司
  stockSymbol?: string; // 股票代码
  financeDate?: Date; // 财报时间
  financeType?: string; // 财报类型
  industry?: string[]; // 行业
  concept?: string[]; // 概念
  cover?: string; // 封面
  pageNumber?: number; // 文档页数
  documentSize?: number; // 文档大小 bytes
  mimetype?: string; // 文件类型
  traceId?: string; // 解析文件的trace_id
}

export const docExtraFields = [
  'company',
  'financeDate',
  'financeType',
  'industry',
  'concept',
  'pageNumber',
  'documentSize',
  'stockSymbol',
];

export const financeTypeNameMap = {
  zhaogushu: '招股说明书',
  year: '年报',
  half_year: '半年报',
  q1: 'Q1季报',
  q2: 'Q2季报',
  q3: 'Q3季报',
  q4: 'Q4季报',
  normal: '通用文档',
};
