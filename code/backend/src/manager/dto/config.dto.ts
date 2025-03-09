import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';
import { IsValidPhoneNumber } from '@/common/validate';
import { DownloadType } from '../interfaces/config';

export class UpdateConfigDto {
  @ApiProperty({ description: 'key' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'data' })
  @IsNotEmpty()
  data: unknown;
}

export class UploadParamsDto {
  @ApiPropertyOptional({ description: 'type', enum: DownloadType })
  @IsOptional()
  @IsEnum(DownloadType)
  type?: DownloadType;

  @ApiPropertyOptional({ description: 'uuid' })
  @IsOptional()
  @IsString()
  uuid?: string;
}

export class PublicDownloadDto {
  @ApiPropertyOptional({ description: 'type', enum: DownloadType })
  @IsOptional()
  @IsEnum(DownloadType)
  type?: DownloadType;

  @ApiProperty({ description: 'uuid' })
  @Type(() => String)
  @IsString()
  path: string;
}

export class ISmsDto {
  @ApiProperty({ description: '手机号' })
  @IsValidPhoneNumber()
  mobile: string;

  @ApiProperty({ description: '国际区号', example: '86' })
  @IsNumberString()
  mobileAreaCode: string;
}

export class GlobalSearchDto {
  @ApiProperty({ description: 'keywords' })
  @IsNotEmpty()
  @IsString()
  keywords: string;
}
