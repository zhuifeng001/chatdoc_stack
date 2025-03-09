// 14 天
export const tokenExpiry = 1000 * 60 * 60 * 24 * 14;

export const tokenKey = 'gpt-qa-token';

// http timeout
export const timeout = 1000 * 60 * 10;

// 文件服务器path
export enum storagePath {
  'public' = 'public',
  'avatar' = 'avatar', // 用户头像
  'cover' = 'cover', // 知识库文档封面
}

// 短信
export const sms = {
  area_code: 86,
  client_id: 113,
  key: '',
  template: '',
};

// 目录最多层级
export const MAX_LOOP = 10;
