import { HttpException, InternalServerErrorException } from '@nestjs/common';
import { AxiosError } from 'axios';

export const filterAxiosError = (result: Error) => {
  if (result instanceof AxiosError) {
    delete result.request;
    if (result.response) {
      delete result.response.headers;
      delete result.response.config;
      delete result.response.request;
    }
  }
};

export const throwError = (result?: unknown) => {
  if (result instanceof AxiosError) {
    filterAxiosError(result);
    throw result;
  } else if (result instanceof HttpException) {
    throw new HttpException(result, result.getStatus());
  } else if (result instanceof Error) {
    throw new InternalServerErrorException(result);
  }
};
