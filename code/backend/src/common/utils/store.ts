import { InternalServerErrorException, Logger } from '@nestjs/common';
import axios from 'axios';
import { throwError } from './error';

export const uploadToStorage = async (uuid: string | number, file: Buffer, path?: string) => {
  let url = process.env.UPLOAD_ADDRESS;
  if (path) {
    url += path;
  }
  if (!url) throw new InternalServerErrorException('缺少UPLOAD_ADDRESS');
  try {
    await axios.post(url + `${uuid}`, file, { timeout: 1000 * 60 * 10 });
    Logger.log(uuid, '文档上传成功');
  } catch (error) {
    throwError(error);
  }
  return uuid;
};
