import { fetch } from '@/common/request';
import { AxiosResponse } from 'axios';
import { Readable, Stream } from 'stream';
export const downloadTextinImage = async (imageId: string) => {
  const url = process.env.TEXTIN_DOWNLOAD_URL + '?image_id=' + imageId;
  const appId = process.env.TEXTIN_APP_ID;
  const appSecret = process.env.TEXTIN_APP_SECRET;
  const timeKey = `[下载图片][image_id=${imageId}]`;
  console.time(timeKey);
  // textin 图片存的是 base64文本
  let res = await fetch
    .get(url, {
      headers: {
        'x-ti-app-id': appId,
        'x-ti-secret-code': appSecret,
        'Content-Type': 'application/json',
      },
    })
    .catch((e) => {
      console.log('downloadTextinImage', e);
      return e;
    });
  // 兼容新的返回结构
  if (res.code == null) {
    res = res.data;
    // console.log('res.data 1', res.data);
  }
  if (res.code !== 200) {
    // console.log('res.data 2', res.data);
  }
  console.timeEnd(timeKey);

  return res.data.image;
};

export const getStreamByTextinImage = async (imageId: string) => {
  const base64Str = await downloadTextinImage(imageId);
  const streamRes = new Readable({ read() {} });
  setTimeout(() => {
    streamRes.push(Buffer.from(base64Str));
    streamRes.push(null);
  });
  return {
    headers: { 'Content-Type': 'text/plain' },
    data: streamRes as unknown,
  } as AxiosResponse<Stream>;
};

export const getStreamByBase64 = async (base64Str: string, contentType: string = 'text/plain') => {
  const streamRes = new Readable({ read() {} });
  streamRes.push(Buffer.from(base64Str, 'base64'));
  streamRes.push(null);
  return {
    headers: { 'Content-Type': contentType },
    data: streamRes as unknown,
  } as AxiosResponse<Stream>;
};

export const trimDataToURL = (data: string) => data.replace(/^data:.*?;base64,/, '');

export const base64ToBuffer = (base64: string) => {
  const binary = atob(trimDataToURL(base64));
  const { length } = binary;
  const buffer = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    buffer[i] = binary.charCodeAt(i) & 0xff;
  }
  return buffer;
};
