import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
} from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  ChatFeedback,
  ChatTypeEnums,
  ComplianceCheckStatus,
  ContentType,
  IChatContext,
  SplitEnum,
} from '../interfaces/chat.interface';
import { Transform, Type } from 'class-transformer';
import { TransformDate, IsDateOrEmpty } from '@/common/validate';
import { DocumentDto, SortEnum } from '@/document/dto/document.dto';
import { PageDto } from '@/common/decorators';

export class CreateChatDto {
  @ApiHideProperty()
  @IsOptional()
  extraParams: Record<string, unknown>;

  @ApiProperty({ description: '提问内容', example: '今年是哪一年' })
  @IsNotEmpty()
  @IsString()
  question: string;

  @ApiPropertyOptional({ description: '对话id', example: null })
  @IsOptional()
  @IsInt()
  chatId?: number;

  @ApiPropertyOptional({ description: '文档id集合', type: [Number], example: [1] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  documentIds?: number[];

  @ApiPropertyOptional({ description: '文件夹id集合', example: null })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  folderIds?: number[];

  @ApiPropertyOptional({ description: 'stream流返回', default: false })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @ApiPropertyOptional({ description: '不显示对话记录', default: false })
  @IsOptional()
  @IsBoolean()
  ignore?: boolean;
}

export class CreateGlobalChatDto {
  @ApiHideProperty()
  @IsOptional()
  extraParams: Record<string, unknown>;

  @ApiProperty({ description: '提问类型', example: 'analyst' })
  @IsOptional()
  @IsString()
  qaType?: string;

  @ApiProperty({ description: '提问内容', example: '今年是哪一年' })
  @IsNotEmpty()
  @IsString()
  question: string;

  @ApiPropertyOptional({ description: '对话id', example: null })
  @IsOptional()
  @IsInt()
  chatId?: number;

  @ApiPropertyOptional({ description: 'stream流返回', default: false })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @ApiPropertyOptional({ description: '不显示对话记录', default: false })
  @IsOptional()
  @IsBoolean()
  ignore?: boolean;
}

export class ChatResDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  context: IChatContext;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  createTime: Date;

  @ApiProperty()
  updateTime: Date;
}

export class ChatContentResDto {
  [key: string]: unknown;

  @ApiProperty()
  id: number;

  @ApiProperty()
  chatId: number;

  @ApiProperty({ description: '内容' })
  content: string;

  @ApiProperty({ enum: ContentType, description: '类型(1提问/2回答)' })
  type: ContentType;

  @ApiProperty({ description: '来源信息' })
  source: string;

  @ApiProperty({ description: '反馈' })
  feedback: ChatFeedback;

  @ApiProperty()
  createTime: Date;

  @ApiProperty()
  updateTime: Date;
}

export class ChatContentListResDto extends ChatContentResDto {
  @ApiProperty()
  context: IChatContext;

  @ApiProperty({ isArray: true, type: DocumentDto })
  documents: DocumentDto[];
}

export class HistoryListDto {
  @ApiPropertyOptional({ description: '文档id' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((i) => Number(i)) : value
  )
  @IsArray()
  @IsInt({ each: true })
  documentId?: number[];

  @ApiPropertyOptional({ description: '数量' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  num?: number;
}

export class HistoryListDetailDto {
  @ApiProperty({ description: '对话id' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  chatId: number;

  @ApiPropertyOptional({ description: '加载该contentId之前的数据' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  endContentId?: number;

  @ApiPropertyOptional({ description: '加载数量', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  num?: number;
}

export class FeedbackDto {
  @ApiProperty({ description: '内容id' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  contentId: number;

  @ApiProperty({ description: '反馈(赞1/踩2)', enum: ChatFeedback })
  @IsEnum(ChatFeedback)
  feedback: ChatFeedback;
}

export class UpdateChatDto {
  @ApiProperty({ description: '对话id' })
  @IsInt()
  chatId: number;

  @ApiProperty({ description: '对话标题' })
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class AnswerIdsDto {
  @ApiPropertyOptional({ description: '回答id集合', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  answerIds: number[];

  @ApiPropertyOptional({ description: '提问id集合', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  questionIds: number[];

  @ApiPropertyOptional({ description: '兼容处理', default: true })
  @IsOptional()
  @IsBoolean()
  compatible: boolean;
}

export class IdsChatDto {
  @ApiProperty({ description: '对话id集合', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  ids: number[];
}

export class RecommendDto {
  @ApiProperty({ description: '文档id集合', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  documentIds?: number[];
}

export class QAQueryDto {
  @ApiPropertyOptional({ description: '问题' })
  @IsOptional()
  @IsString()
  question?: string;

  @ApiPropertyOptional({ description: '文档id集合', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  documentIds?: number[];

  @ApiPropertyOptional({ description: '合规审核状态集合', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  complianceCheck?: ComplianceCheckStatus[];

  @ApiPropertyOptional({ description: '提问时间', type: [Date, Date], example: null })
  @IsOptional()
  @Transform(TransformDate)
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsDateOrEmpty({ each: true })
  createTime?: Array<Date | null>;

  @ApiProperty({ description: '用户id' })
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiProperty({ description: '问答类型：1. 指定文档问答，2. 全局问答' })
  @IsOptional()
  @IsInt()
  chatType?: ChatTypeEnums;

  @ApiProperty({ description: '是否查询全部（后台搜索）' })
  @IsOptional()
  @IsInt()
  full?: number;

  @ApiPropertyOptional({ description: '是否过滤内部用户', type: Boolean })
  @IsOptional()
  @IsBoolean()
  excludeInternalUser?: boolean;
}

export class QASortDto {
  [key: string]: SortEnum;

  @ApiProperty({ enum: SortEnum })
  @IsOptional()
  @Transform(({ value }) => value.toUpperCase())
  @IsEnum(SortEnum)
  createTime?: SortEnum;
}

export class ListChatBodyDto extends IntersectionType(QAQueryDto, PageDto) {
  @ApiPropertyOptional({ description: '排序', type: QASortDto })
  @IsOptional()
  sort?: QASortDto;
}

export class StatisticsDto {
  @ApiProperty({ description: '提问时间', type: [Date, Date], example: [new Date(), new Date()] })
  @Transform(TransformDate)
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsDate({ each: true })
  createTime: Array<Date | null>;

  @ApiPropertyOptional({ description: '统计维度', enum: SplitEnum })
  @IsOptional()
  @IsEnum(SplitEnum)
  split: SplitEnum;
}

export class StatisticsResDto {
  @ApiProperty({ description: '总数' })
  count: number;

  @ApiProperty({ description: '查询范围内的总数' })
  rangeTotal: number;

  @ApiProperty({ description: '每天都调用数' })
  list: { day: string; count: number }[];
}
