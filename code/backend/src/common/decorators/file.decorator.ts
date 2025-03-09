import {
  createParamDecorator,
  ExecutionContext,
  FileValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
} from '@nestjs/common';
import { raw, Request, Response } from 'express';
import { fromBuffer } from 'file-type';

export const BinaryFile = createParamDecorator(async (data: unknown, ctx: ExecutionContext) => {
  const request: Request = ctx.switchToHttp().getRequest();
  const response: Response = ctx.switchToHttp().getResponse();
  request.headers['content-type'] = 'application/octet-stream';
  await new Promise((resolve) => raw({ limit: '1024mb' })(request, response, resolve));
  const buffer = request.body;
  const { ext = '', mime = '' } = (await fromBuffer(buffer)) || {};
  return { mimetype: mime, ext, size: buffer.length, buffer };
});

export class FileTypesValidator extends FileValidator {
  buildErrorMessage() {
    return `文件类型不支持`;
  }
  isValid(file) {
    if (!this.validationOptions) {
      return true;
    }
    if (!!file && 'mimetype' in file) {
      const { fileType } = this.validationOptions;
      if (Array.isArray(fileType)) {
        return fileType.some((typeItem) => !!file.mimetype.match(typeItem));
      }
      return !!file.mimetype.match(fileType);
    }
    return false;
  }
}

export class FileEmptyValidator extends FileValidator {
  buildErrorMessage() {
    return `请不要上传空文档`;
  }
  isValid(file) {
    return !!file.size;
  }
}

const FILE_SIZE = 500;
const FILE_TYPES = [/.*/];

export class ValidatorFilePipe extends ParseFilePipe {
  constructor({
    size = FILE_SIZE,
    fileType = FILE_TYPES,
  }: { size?: number; fileType?: Array<string | RegExp> } = {}) {
    super({
      validators: [
        new FileEmptyValidator({ size }),
        new MaxFileSizeValidator({
          maxSize: 1024 * 1024 * size,
          message: `单个文件需小于${size}MB`,
        }),
        new FileTypesValidator({ fileType }),
      ],
    });
  }
}
