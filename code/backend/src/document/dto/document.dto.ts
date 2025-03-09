import { ApiProperty, ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PageDto } from '@/common/decorators';
import { IsDateOrEmpty, TransformDate } from '@/common/validate';
import {
  ChatDocDocumentStatus,
  DocumentStatus,
  DocumentStatusLabel,
  DocumentType,
  DocumentVisibilityEnums,
  DownloadEnum,
  SortTypeEnum,
} from '../interfaces/document.interface';

export class CreateFianceDocumentDto {
  @ApiProperty({ description: '文档', type: 'string', format: 'binary' })
  file: unknown;

  @ApiProperty({ description: '文档名称' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: '知识库id' })
  @Type(() => Number)
  @IsInt()
  libraryId: number;

  @ApiProperty({ description: '企业名称' })
  @IsNotEmpty()
  @MaxLength(50, { message: '企业名称请不要超过50个字符' })
  @IsString()
  company: string;

  @ApiProperty({ description: '财报时间', type: 'date' })
  @Type(() => Date)
  @IsDate()
  financeDate: Date;

  @ApiPropertyOptional({ description: '财报类型' })
  @IsOptional()
  @IsString()
  financeType: string;

  @ApiPropertyOptional({ description: '股票代码', example: '' })
  @IsOptional()
  @IsString()
  stockSymbol?: string;

  @ApiPropertyOptional({ description: '行业', type: [String] })
  @IsOptional()
  @Transform(({ value }) => (value && typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @IsString({ each: true })
  industry: string[];

  @ApiPropertyOptional({ description: '概念', type: [String] })
  @IsOptional()
  @Transform(({ value }) => (value && typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @IsString({ each: true })
  concept: string[];

  @ApiPropertyOptional({ description: '文档页数' })
  @IsOptional()
  @IsInt()
  pageNumber: number;
}

export class FinanceDocumentQueryDto {
  @ApiProperty({ description: '知识库id', default: 1 })
  @IsInt()
  libraryId: number;

  @ApiPropertyOptional({ description: '财报时间', type: [Date, Date], example: [new Date(), null] })
  @IsOptional()
  @Transform(TransformDate)
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsDateOrEmpty({ each: true })
  financeDate?: Array<Date | null>;

  @ApiPropertyOptional({ description: '企业名称', default: '' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ description: '财报类型', default: null })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  financeType?: string[];

  @ApiPropertyOptional({ description: '行业', default: null })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industry?: string[];

  @ApiPropertyOptional({ description: '概念', default: null })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  concept?: string[];

  @ApiPropertyOptional({ description: '文档名称', default: '' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '状态', type: [Number], example: [DocumentStatus.success] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  status?: DocumentStatus[];

  @ApiPropertyOptional({
    description: '可见',
    example: DocumentVisibilityEnums.VISIBLE,
  })
  @IsOptional()
  visibility?: DocumentVisibilityEnums | DocumentVisibilityEnums[];

  @ApiPropertyOptional({ description: '更新人', type: [Number], example: [1] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  updateBy?: number[];

  @ApiPropertyOptional({ description: '更新时间', type: [Date, Date], example: [new Date(), null] })
  @IsOptional()
  @Transform(TransformDate)
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsDateOrEmpty({ each: true })
  updateTime?: Array<Date | null>;

  @ApiPropertyOptional({ description: '文档名称&企业名称&财报时间&股票代码', default: null })
  @IsOptional()
  @IsString()
  keywords?: string;
}

export enum SortEnum {
  'ASC' = 'ASC',
  'DESC' = 'DESC',
}

export class DocSortDto {
  [key: string]: SortEnum;

  @ApiProperty({ enum: SortEnum })
  @IsOptional()
  @Transform(({ value }) => value.toUpperCase())
  @IsEnum(SortEnum)
  financeDate?: SortEnum;

  @ApiProperty({ enum: SortEnum })
  @IsOptional()
  @Transform(({ value }) => value?.toUpperCase())
  @IsEnum(SortEnum)
  updateTime?: SortEnum;
}

export class ListDocBodyDto extends IntersectionType(FinanceDocumentQueryDto, PageDto) {
  @ApiPropertyOptional({ description: '排序', type: DocSortDto })
  @IsOptional()
  sort?: DocSortDto;
}

export class UploadQueryDto {
  @ApiPropertyOptional({ description: '文件夹id' })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'folderId invalid' })
  folderId?: number;

  @ApiProperty({ description: '文件名' })
  @IsNotEmpty()
  @IsString()
  filename: string;
}

export class DocHandleParams {
  @ApiProperty({ description: '不自动解析文档' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  noParse?: boolean;
}

export class DocIdListDto {
  @ApiProperty({ description: 'id集合', type: [Number] })
  @ArrayNotEmpty()
  @IsArray()
  @IsInt({ each: true })
  ids: number[];
}

export class ListByUserDto {
  @ApiPropertyOptional({ description: '用户id' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({ description: '文档名称', default: '' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '状态', type: [Number], example: [DocumentStatus.success] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  status?: DocumentStatus[];

  @ApiPropertyOptional({ description: '更新时间', type: [Date, Date], example: [new Date(), null] })
  @IsOptional()
  @Transform(TransformDate)
  @IsArray()
  @ArrayMaxSize(2)
  @IsDateOrEmpty({ each: true })
  updateTime?: Array<Date | null>;
}

export class ListByFilterDto {
  @ApiPropertyOptional({ description: '文档id集合', type: [Number] })
  @IsOptional()
  @ArrayNotEmpty()
  @IsArray()
  @IsInt({ each: true })
  ids?: number[];

  @ApiPropertyOptional({ description: '文档uuids集合', type: [String] })
  @IsOptional()
  @ArrayNotEmpty()
  @IsArray()
  @IsString({ each: true })
  uuids?: string[];

  @ApiPropertyOptional({ description: '文件夹id集合', type: [Number] })
  @IsOptional()
  @ArrayNotEmpty()
  @IsArray()
  @IsInt({ each: true })
  folderIds?: number[];

  @ApiPropertyOptional({ description: '文档名称' })
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiPropertyOptional({ description: '文档状态', enum: DocumentStatus })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({ description: '文档类型', enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;
}

export class DocumentFolderMoveDto {
  @ApiProperty({ description: '文档id' })
  @IsInt()
  documentId: number;

  @ApiPropertyOptional({ description: '文件夹id（移动到根目录时为null）' })
  @IsOptional()
  @IsInt()
  folderId?: number;
}

export class DocumentExtraDataDto {
  @ApiPropertyOptional({ description: '企业名称' })
  company?: string;

  @ApiPropertyOptional({ description: '股票代码' })
  stockSymbol?: string;

  @ApiPropertyOptional({ description: '财报时间' })
  financeDate?: Date;

  @ApiPropertyOptional({ description: '财报类型' })
  financeType?: string;

  @ApiPropertyOptional({ description: '行业' })
  industry?: string[];

  @ApiPropertyOptional({ description: '概念' })
  concept?: number[];

  @ApiPropertyOptional({ description: '封面' })
  cover?: string;

  @ApiPropertyOptional({ description: '文档页数' })
  pageNumber?: number;
}

export class DocumentDto {
  @ApiProperty({ description: 'id' })
  id: number;

  @ApiProperty({ description: '文档uuid' })
  uuid: string;

  @ApiProperty({ description: '文档名称' })
  name: string;

  @ApiProperty({ description: '知识库id' })
  libraryId: number;

  @ApiProperty({ description: '文件夹id' })
  folderId: number;

  @ApiProperty({ description: '更新人id' })
  updateBy: number;

  @ApiProperty({ description: '文档解析状态', enum: DocumentStatus })
  status: DocumentStatus;

  @ApiProperty({ description: '创建时间' })
  createTime: Date;

  @ApiProperty({ description: '更新时间' })
  updateTime: Date;

  type: DocumentType;

  @ApiProperty({ description: '文档信息', type: DocumentExtraDataDto })
  extraData: DocumentExtraDataDto;
}

export class DocumentDtoDetailDto extends DocumentDto {
  @ApiProperty({ description: '更新人account' })
  updateByName: string;
}

export class QueryDetailDto {
  @ApiProperty({ description: '文档id' })
  @Type(() => Number)
  @IsInt()
  id: number;
}

export class DownloadQueryDto {
  @ApiProperty({ description: '文档id' })
  @IsString()
  id: string;

  @ApiProperty({ description: '类型', enum: DownloadEnum })
  @IsEnum(DownloadEnum)
  type: DownloadEnum;

  @ApiProperty({ description: '图片id' })
  @IsString()
  @IsOptional()
  image_id?: string;

  @ApiPropertyOptional({ description: '文档类型', enum: DocumentType })
  @IsOptional()
  @IsString()
  document_type?: DocumentType;
}

export class DocumentSortDto {
  @ApiProperty({ description: '文档id' })
  @Type(() => Number)
  @IsInt()
  id: number;

  @ApiProperty({ description: '文档顺序' })
  @Type(() => Number)
  @IsInt()
  sort: number;

  @ApiProperty({
    description: '类型（文档/文件夹）',
    enum: SortTypeEnum,
    example: SortTypeEnum.document,
  })
  @IsEnum(SortTypeEnum)
  type: SortTypeEnum;
}

export class FileMeta {
  @ApiPropertyOptional({ description: '文档总页数' })
  page_number: number;

  @ApiPropertyOptional({ description: '第一页图片ID' })
  first_image_id: string;

  @ApiPropertyOptional({ description: '系统知识库：0，个人知识库：User_1（User_{user_id}）' })
  knowledge_id: string;

  @ApiPropertyOptional({ description: '文档所属（系统知识库、个人知识库）' })
  ori_type: string;
}

export class CallbackDto {
  @ApiProperty({ description: '文档uuid' })
  @IsString()
  uuid: string;

  @ApiProperty({
    description: `状态(${Object.values(DocumentStatusLabel)})`,
    enum: ChatDocDocumentStatus,
  })
  @Type(() => Number)
  @IsEnum(ChatDocDocumentStatus)
  status: ChatDocDocumentStatus;

  @ApiPropertyOptional({ description: '信息' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ description: '回调文档信息', type: FileMeta })
  @IsOptional()
  @Type(() => FileMeta)
  file_meta?: FileMeta;
}

export class DocSummaryDto {
  @ApiPropertyOptional({ description: '文档uuid' })
  @IsOptional()
  @IsString()
  uuid: string;

  @ApiPropertyOptional({ description: '内容' })
  @IsOptional()
  @IsString()
  data?: string;

  @ApiPropertyOptional({ description: '文档id' })
  @IsOptional()
  @IsInt()
  id: number;

  @ApiPropertyOptional({ description: '重新生成', default: null })
  @IsOptional()
  @IsBoolean()
  regeneration: boolean;
}

export class UpdateDocDto {
  @ApiProperty({ description: '文档id' })
  @Type(() => Number)
  @IsInt()
  id: number;

  @ApiPropertyOptional({ description: '文档名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '企业名称', example: null })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ description: '财报时间', example: null })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  financeDate?: Date;

  @ApiPropertyOptional({ description: '财报类型', example: null })
  @IsOptional()
  @IsString()
  financeType?: string;

  @ApiPropertyOptional({ description: '股票代码', example: null })
  @IsOptional()
  @IsString()
  stockSymbol?: string;

  @ApiPropertyOptional({ description: '行业', type: [String], example: null })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industry?: string[];

  @ApiPropertyOptional({ description: '概念', type: [String], example: null })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  concept?: string[];

  @ApiPropertyOptional({ description: '封面', example: null })
  @IsOptional()
  @IsString()
  cover?: string;

  @ApiPropertyOptional({ description: '文档页数', example: null })
  @IsOptional()
  @IsInt()
  pageNumber?: number;

  @ApiPropertyOptional({ description: '文档大小', example: null })
  @IsOptional()
  @IsInt()
  documentSize?: number;

  @ApiPropertyOptional({ description: '状态', example: null })
  @IsOptional()
  @IsInt()
  status?: number;

  @ApiPropertyOptional({ description: '状态', example: null })
  @IsOptional()
  @IsInt()
  visibility?: number;
}

class FilterItem {
  @ApiProperty({ description: '名称' })
  name: string;

  @ApiProperty({ description: '值' })
  value: string;
}

export class FilterConfigDto {
  @ApiProperty({
    description: '财报类型',
    type: FilterItem,
    isArray: true,
  })
  financeType: FilterItem[];

  @ApiProperty({ description: '行业', type: FilterItem, isArray: true })
  industry: FilterItem[];

  @ApiProperty({ description: '概念', type: FilterItem, isArray: true })
  concept: FilterItem[];
}
