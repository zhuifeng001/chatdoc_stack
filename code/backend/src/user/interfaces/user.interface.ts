export enum IUserRole {
  'admin' = 0,
  'manager' = 1,
  'user' = 2,
}

export enum IUserStatus {
  'normal' = 1,
  'disabled' = 10,
  'disabled_infer' = 20,
}

export const userStatusLabel = {
  [IUserStatus.normal]: '正常',
  [IUserStatus.disabled]: '禁用账号',
  [IUserStatus.disabled_infer]: '禁用提问',
};

export const userRoleLabel = {
  [IUserRole.admin]: '超级管理员',
  [IUserRole.manager]: '普通管理员',
  [IUserRole.user]: '普通用户',
};

export interface IUser {
  id: number;
  account: string;
  role: IUserRole;
  status: IUserStatus;
}
