import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LibrarySortField, LibraryType } from '../interfaces/library.interface';
import { SortEnum } from '@/document/dto/document.dto';
import { Transform } from 'class-transformer';

export class CreateLibraryDto {
  @ApiProperty({ description: '知识库名称' })
  @MaxLength(50, { message: '知识库名称请不要超过50个字符' })
  @IsString()
  name: string;

  @ApiProperty({ description: '知识库描述' })
  @MaxLength(3000, { message: '知识库描述请不要超过3000个字符' })
  @IsString()
  note: string;

  @ApiProperty({ description: '知识库描述摘要' })
  @MaxLength(50, { message: '知识库描述请不要超过50个字符' })
  @IsString()
  summary?: string;

  @ApiProperty({ description: '知识库类型(自定义知识库:10)', enum: LibraryType })
  @IsOptional()
  @IsEnum(LibraryType)
  type: LibraryType = LibraryType.financial_report;

  userId?: number;
}

export class UpdateLibraryDto {
  @ApiProperty({ description: '知识库id' })
  @IsInt()
  id: number;

  @ApiProperty({ description: '知识库名称' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: '知识库描述' })
  @IsString()
  note: string;

  @ApiPropertyOptional({ description: '知识库描述摘要' })
  @IsOptional()
  @IsString()
  summary?: string;
}

export class LibraryDeleteDto {
  @ApiProperty({ description: '知识库id集合', type: [Number] })
  @ArrayNotEmpty()
  @IsArray()
  @IsInt({ each: true })
  ids: number[];
}

export class LibraryDetailDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  note: string;

  @ApiProperty({ enum: LibraryType })
  type: LibraryType;

  @ApiProperty()
  createTime: Date;

  @ApiProperty()
  updateTime: Date;
}

export class LibraryQueryDto {
  @ApiPropertyOptional({ description: '排序', enum: LibrarySortField })
  @IsOptional()
  @IsEnum(LibrarySortField)
  sort?: LibrarySortField;

  @ApiPropertyOptional({ description: '升序/降序', enum: SortEnum })
  @IsOptional()
  @IsEnum(SortEnum)
  sortType?: SortEnum;

  @ApiPropertyOptional({ description: '知识库类型（自定义知识库10）', enum: LibraryType })
  @IsOptional()
  @Transform(({ value }) => value && Number(value))
  @IsEnum(LibraryType)
  type?: LibraryType;
}

export class LibraryTreeDto {
  @ApiPropertyOptional({ description: '不返回文档', default: false })
  @IsBoolean()
  noDocument?: boolean;
}
