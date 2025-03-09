import {
  ExecutionContext,
  Injectable,
  CanActivate,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserService } from '@/user/user.service';
import { IUser, IUserRole } from '@/user/interfaces/user.interface';
import { getToken } from '../decorators';
import { isInternalIp } from '../utils';

export const IS_PUBLIC_KEY = 'isPublic';
export const USER_ROLE_LIST = 'userRole';
export const IS_INTERNAL = 'isInternal';

export interface IPayload {
  id: number;
  account: string;
  uuid: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private userService: UserService, private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let isPublic = this.reflector.getAllAndOverride(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const isInternal = this.reflector.getAllAndOverride(IS_INTERNAL, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request: Request = context.switchToHttp().getRequest();
    const token = getToken(request);

    // 内网权限
    if (isInternal) {
      isPublic = true;
      // if (isInternalIp(request.ip)) {
      //   isPublic = true;
      // } else {
      //   throw new ForbiddenException();
      // }
    }

    if (!token && !isPublic) {
      throw new UnauthorizedException();
    }

    let user: IUser | null;
    try {
      user = await this.userService.validateToken(token);
      if (!user?.id) throw new UnauthorizedException();
      request['user'] = user;
    } catch {
      if (!isPublic) {
        throw new UnauthorizedException();
      }
    }

    // 用户权限
    const roleList: IUserRole[] = this.reflector.getAllAndOverride(USER_ROLE_LIST, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (Array.isArray(roleList) && !roleList.includes(user?.role)) {
      throw new ForbiddenException();
    }

    return true;
  }
}
