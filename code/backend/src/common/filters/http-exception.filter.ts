import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';
import { isHttpError } from 'http-errors';
import { AxiosError } from 'axios';
import { filterAxiosError } from '../utils';

const defaultMsg = '请求失败';

const LoggerException = (response: Response, exception: Error, code: number) => {
  const { method, url, ip } = response.req;
  const message = `${method}:${url} ${exception}`;
  const context = '全局异常捕获';
  if (code >= 500) {
    Logger.error(message, context);
    filterAxiosError(exception);
    console.log(exception);
  } else if (exception instanceof ThrottlerException) {
    Logger.log(`[ip]${ip} ${message}`, context);
  } else {
    Logger.log(message, context);
  }
};

const getErrorCode = (exception: Error) => {
  if (exception instanceof AxiosError) {
    return exception.response?.status || 500;
  }
  return 500;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx: HttpArgumentsHost = host.switchToHttp();
    const response: Response = ctx.getResponse();
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionRes = exception.getResponse();
      let msg =
        typeof exceptionRes === 'object' && 'message' in exceptionRes
          ? exceptionRes.message.toString()
          : '';
      if (exception instanceof InternalServerErrorException) {
        msg = defaultMsg;
      } else if (exception instanceof ThrottlerException) {
        msg = '请求太频繁';
      }

      response.status(statusCode).json({
        code: statusCode,
        msg: msg || defaultMsg,
      });
      LoggerException(response, exception, statusCode);
    } else if (isHttpError(exception)) {
      const { statusCode, message } = exception;
      response.status(statusCode).json({
        code: statusCode,
        msg: message || defaultMsg,
      });
      LoggerException(response, exception, statusCode);
    } else {
      LoggerException(response, exception, 500);
      const statusCode = getErrorCode(exception);
      response.status(statusCode).json({
        code: statusCode,
        msg: defaultMsg,
      });
    }
  }
}
