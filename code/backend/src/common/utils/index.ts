import * as _ from 'lodash';
import * as crypto from 'crypto';
import * as sharp from 'sharp';

export * from './error';
export * from './name';
export * from './store';

// 驼峰转下划线
export const toSnakeCase = <T>(params: T): T => {
  const data = JSON.parse(JSON.stringify(params));
  if (Array.isArray(data)) {
    return data.map((item) => toSnakeCase(item)) as T;
  } else if (data && typeof data === 'object') {
    const obj = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        obj[_.snakeCase(key)] = toSnakeCase(data[key]);
      }
    }
    return obj as T;
  }
  return data;
};

// 下划线转驼峰
export const toCamelCase = <T>(params: T): T => {
  const data = JSON.parse(JSON.stringify(params));
  if (Array.isArray(data)) {
    return data.map((item) => toCamelCase(item)) as T;
  } else if (data && typeof data === 'object') {
    const obj = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        obj[_.camelCase(key)] = toCamelCase(data[key]);
      }
    }
    return obj as T;
  }
  return data;
};

// 去除空字段
export const filterEmpty = <T extends object>(data: T): T => {
  const fn = (val, key) => ![null, undefined, ''].includes(key);
  if (Array.isArray(data)) {
    return data.map((item) => _.pickBy(item, fn)) as T;
  }
  return _.pickBy(data, fn) as T;
};

export const md5 = (data: crypto.BinaryLike) => {
  return crypto.createHash('md5').update(data).digest('hex');
};

// 裁剪图片
export const resizeImage = async (
  file: Buffer,
  size: { width?: number; height?: number; fit?: 'contain' | 'cover' }
) => {
  return await sharp(file)
    .resize({ ...size, fit: 'cover' })
    .toBuffer();
};

export const generateRandomStr = (
  len: number,
  type: 'character' | 'number' = 'character'
): string => {
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  if (type === 'number') {
    characters = '0123456789';
  }
  let randomString = '';
  for (let i = 0; i < len; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters.charAt(randomIndex);
  }
  return randomString;
};

// 内部ip
const strictDefault = process.env.STRICT_INTERNAL_IP === 'true';
export const isInternalIp = (ip: string, { strict = strictDefault }: { strict?: boolean } = {}) => {
  // console.log('isInternalIp', ip, strict);
  const localIp = ['::1', '127.0.0.1']; // 本机
  const serverIp = ['10.26.1.*', '10.48.1.*']; // 服务器白名单
  const whitelist = [...localIp, ...serverIp];
  if (!strict) {
    // 公司内网
    whitelist.unshift(...['192.168.*', '10.2.*']);
  }
  return whitelist.some((item) =>
    new RegExp(item.replace(/\./g, '\\.').replace(/\*/, '[0-9]+')).test(ip)
  );
};
