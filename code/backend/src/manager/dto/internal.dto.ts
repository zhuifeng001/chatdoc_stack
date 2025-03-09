import { ChatFeedback } from '@/chat/interfaces/chat.interface';
import { IsDateOrEmpty, TransformDate } from '@/common/validate';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { DocumentStatus, DocumentType } from '@/document/interfaces/document.interface';

export class DocAllQueryDto {
  @ApiPropertyOptional({ description: 'id集合', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  ids?: number[];

  @ApiPropertyOptional({ description: 'uuid集合', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  uuids?: string[];

  @ApiPropertyOptional({ description: '公司' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ description: '文件名' })
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiPropertyOptional({ description: '类型', enum: DocumentType, example: null })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @ApiPropertyOptional({ description: '状态' })
  @IsOptional()
  @IsInt()
  status?: DocumentStatus;

  @ApiPropertyOptional({ description: '财报时间', type: [Date, Date], example: [new Date(), null] })
  @IsOptional()
  @Transform(TransformDate)
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsDateOrEmpty({ each: true })
  financeDate?: Array<Date | null>;

  @ApiPropertyOptional({ description: '财报类型', default: null })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  financeType?: string[];

  @ApiPropertyOptional({ description: '文档页数', default: null })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  pageNumber?: number[];
}

export class ExportFilterDto {
  @ApiPropertyOptional({ description: '时间范围', type: [Date, Date], example: [new Date(), null] })
  @IsOptional()
  @Transform(TransformDate)
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsDateOrEmpty({ each: true })
  timeRange?: Array<Date | null>;

  @ApiPropertyOptional({ description: '用户id集合', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  userIds?: number[];

  @ApiPropertyOptional({ description: '反馈', enum: ChatFeedback })
  @IsOptional()
  @IsEnum(ChatFeedback)
  feedback?: ChatFeedback;
}
