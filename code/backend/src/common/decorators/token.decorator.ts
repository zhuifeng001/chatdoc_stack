import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { tokenKey } from '../constant';

export function getToken(request: Request) {
  return request.headers.authorization || request.headers[tokenKey] || request.cookies[tokenKey];
}

export const Token = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request: Request = ctx.switchToHttp().getRequest();
  return getToken(request);
});
