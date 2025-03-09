export enum ContentType {
  'question' = 1,
  'answer' = 2,
}

export enum GlobalQaType {
  'global' = 'global',
  'analyst' = 'analyst',
  'personal' = 'personal'
}

export enum ChatType {
  'document' = 0,
  'global' = 1,
  'analyst' = 2,
  'personal' = 3
}

export enum ContentStatus {
  'script' = 1,
}

export enum ComplianceCheckStatus {
  QUESTION_PASS = 1,
  QUESTION_NO_PASS = 2,
  ANSWER_PASS = 3,
  ANSWER_NO_PASS = 4,
}

export enum ChatFeedback {
  'upvote' = 1,
  'downvote' = 2,
}

export interface IChatContext {
  [key: string]: unknown;

  ids: number[];

  folders: number[];
}

export enum SplitEnum {
  'hour' = 'hour',
  'day' = 'day',
}

export interface IContentExtraData {
  [key: string]: unknown;

  questionId: number | string;
  answerId: number | string;
  answer: string;
  traceId?: string;
  original: unknown;
}

export interface RetrievalSource {
  ori_id: string;
  i: number;
  uuid: string;
}

export enum ChatTypeEnums {
  Document = 1, // 指定文档问答
  Global = 2, // 全局问答
}
