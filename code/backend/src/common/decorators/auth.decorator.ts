import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { IUserRole } from '@/user/interfaces/user.interface';
import { IS_PUBLIC_KEY, USER_ROLE_LIST, IS_INTERNAL } from '../guards/auth.guard';

const mergeApiOperation = (target, metadataKey) => {
  const val = Reflect.getMetadata(DECORATORS.API_OPERATION, target);
  if (val?.summary) {
    const tagMap = {
      [IS_PUBLIC_KEY]: '【Public】🔑',
      [IS_INTERNAL]: '【Internal】🔒',
      [USER_ROLE_LIST]: '【Admin】🔐',
    };
    val.summary += ' •' + tagMap[metadataKey];
  }
  Reflect.defineMetadata(DECORATORS.API_OPERATION, val, target);
};

const SetAndMergeMetadata = (metadataKey, metadataValue) => {
  const decoratorFactory = (target: object, key, descriptor) => {
    mergeApiOperation(descriptor ? descriptor.value : target, metadataKey);
    if (descriptor) {
      Reflect.defineMetadata(metadataKey, metadataValue, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(metadataKey, metadataValue, target);
    return target;
  };
  decoratorFactory.KEY = metadataKey;
  return decoratorFactory;
};

// 无鉴权
export const Public = () => SetAndMergeMetadata(IS_PUBLIC_KEY, true);

// 角色
export const UserRole = (role: IUserRole | IUserRole[]) =>
  SetAndMergeMetadata(USER_ROLE_LIST, Array.isArray(role) ? role : [role]);

// 内部网络
export const Internal = () => SetAndMergeMetadata(IS_INTERNAL, true);
