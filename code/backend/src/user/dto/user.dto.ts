import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsValidPhoneNumber, TransformDate } from '@/common/validate';
import {
  IUserRole,
  IUserStatus,
  userRoleLabel,
  userStatusLabel,
} from '../interfaces/user.interface';
import { Transform } from 'class-transformer';
import { SortEnum } from '@/document/dto/document.dto';

export class UserLoginDto {
  @ApiPropertyOptional({ description: 'textin openid' })
  @IsOptional()
  @IsString()
  openid?: string;

  @ApiPropertyOptional({ description: '名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '账号' })
  @IsOptional()
  @IsString()
  account?: string;

  @ApiPropertyOptional({ description: '密码(MD5加密)' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: '手机号', example: null })
  @IsOptional()
  @IsValidPhoneNumber()
  mobile?: string;

  @ApiPropertyOptional({ description: '手机号国际区号', example: '86' })
  @IsOptional()
  @IsNumberString()
  mobileAreaCode?: string;

  @ApiPropertyOptional({ description: '邮箱', example: null })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: '验证码', example: null })
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  loginFailedCount?: number;
}

export class UserUpdatePassword {
  @ApiPropertyOptional({ description: '账号', default: null })
  @IsOptional()
  @IsString()
  account?: string;

  @ApiProperty({ description: '新密码(MD5加密)' })
  @IsString()
  newPassword: string;
}

export class UserRegisterDto {
  @ApiPropertyOptional({ description: '账号', example: null })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  @MinLength(1)
  account?: string;

  @ApiPropertyOptional({ description: '手机号', example: null })
  @IsOptional()
  @IsValidPhoneNumber()
  mobile?: string;

  @ApiPropertyOptional({ description: '手机号国际区号', example: '86' })
  @IsOptional()
  @IsString()
  mobileAreaCode?: string;

  @ApiPropertyOptional({ description: '邮箱', example: null })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: '密码(MD5加密)' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiHideProperty()
  // @ApiPropertyOptional({
  //   description: `用户角色(${Object.values(userRoleLabel).join('/')})`,
  //   enum: IUserRole,
  //   default: IUserRole.user,
  // })
  @IsOptional()
  @IsEnum(IUserRole)
  role?: IUserRole;
}

export class UserDetailDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  account: string;

  @ApiProperty({
    description: `用户角色(${Object.values(userRoleLabel).join('/')})`,
    enum: IUserRole,
  })
  role: IUserRole;

  @ApiProperty()
  mobile: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  avatar: string;

  @ApiProperty()
  createTime: Date;

  @ApiProperty()
  updateTime: Date;
}

export class UpdateUserKeyInfoDto {
  @ApiProperty({ description: '用户id' })
  @IsInt()
  id: number;

  @ApiPropertyOptional({ description: '账号' })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  @MinLength(1)
  account?: string;

  @ApiPropertyOptional({ description: '邮箱' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: '手机号' })
  @IsOptional()
  @IsValidPhoneNumber()
  mobile?: string;

  @ApiPropertyOptional({
    description: `用户角色(${Object.values(userRoleLabel).join('/')})`,
    enum: IUserRole,
    default: IUserRole.user,
  })
  @IsOptional()
  @IsEnum(IUserRole)
  role?: IUserRole;

  @ApiPropertyOptional({ description: '用户状态', enum: IUserStatus, default: IUserStatus.normal })
  @IsOptional()
  @IsEnum(IUserStatus)
  status?: IUserStatus;
}

export class UpdateUserInfoDto {
  @ApiPropertyOptional({ description: '名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '头像' })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class ForceUpdateUserInfoDto {
  @ApiPropertyOptional({ description: '名称' })
  @IsOptional()
  @IsString()
  name?: string;
  @ApiPropertyOptional({ description: '账号' })
  @IsOptional()
  @IsString()
  account?: string;
  @ApiPropertyOptional({ description: '手机号' })
  @IsOptional()
  @IsString()
  mobile?: string;
  @ApiPropertyOptional({ description: '邮箱' })
  @IsOptional()
  @IsString()
  email?: string;
  @ApiPropertyOptional({ description: 'textin openid' })
  @IsOptional()
  @IsString()
  openid?: string;
}

export class SearchUserInfoDto {
  @ApiPropertyOptional({ description: '用户id' })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiPropertyOptional({ description: '账号' })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  @MinLength(1)
  account?: string;

  @ApiPropertyOptional({ description: '邮箱' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: '手机号' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({
    description: `用户角色(${Object.values(userRoleLabel).join('/')})`,
    // enum: IUserRole,
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  role?: IUserRole[];

  @ApiPropertyOptional({
    description: `用户状态(${Object.values(userStatusLabel).join('/')})`,
    enum: IUserStatus,
  })
  @IsOptional()
  @IsEnum(IUserStatus)
  status?: IUserStatus[];

  @ApiProperty({ description: '创建时间', type: [Date, Date], example: [new Date(), new Date()] })
  @Transform(TransformDate)
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsDate({ each: true })
  @IsOptional()
  createTime: Array<Date | null>;
}

export class UserSortDto {
  [key: string]: SortEnum;

  @ApiProperty({ enum: SortEnum })
  @IsOptional()
  @Transform(({ value }) => value.toUpperCase())
  @IsEnum(SortEnum)
  createTime?: SortEnum;
}
