import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SortEnum } from '@/document/dto/document.dto';
import { SortField } from '../interfaces/folder.interface';

export class CreateFolderDto {
  @ApiProperty({ description: '文件夹名称' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '父级文件夹id' })
  @IsOptional()
  @IsInt()
  parentId?: number;

  userId: number;
}

export class UpdateFolderDto {
  @ApiProperty({ description: '文件夹id' })
  @IsInt()
  id: number;

  @ApiProperty({ description: '文件夹名称' })
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class MoveFolderDto {
  @ApiProperty({ description: '文件夹id' })
  @IsInt()
  id: number;

  @ApiPropertyOptional({ description: '目标位置id(文件夹id或者null)' })
  @IsOptional()
  @IsInt()
  targetId: number;
}

export class FolderDeleteDto {
  @ApiProperty({ description: '文件夹id集合', type: [Number] })
  @ArrayNotEmpty()
  @IsArray()
  @IsInt({ each: true })
  ids: number[];

  @ApiProperty({ description: '是否同时删除文档', default: true })
  @IsBoolean()
  deleteDocument: boolean = true;
}

export class FolderDetailDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  libraryId: number;

  @ApiProperty()
  createTime: Date;

  @ApiProperty()
  updateTime: Date;
}

export class ChildrenQueryDto {
  @ApiPropertyOptional({ description: 'id' })
  @IsOptional()
  @IsInt()
  id: number;

  @ApiPropertyOptional({ description: '不显示children树状数据' })
  @IsOptional()
  @IsBoolean()
  noChildTree?: boolean;

  @ApiPropertyOptional({ description: '搜索' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '排序', enum: SortField })
  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsEnum(SortField)
  sort?: SortField;

  @ApiPropertyOptional({ description: '升序/降序', enum: SortEnum })
  @IsOptional()
  @IsEnum(SortEnum)
  sortType?: SortEnum;
}
