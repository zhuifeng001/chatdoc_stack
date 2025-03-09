import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { IRecycleSource, RecycleSortField, RecycleTypeEnum } from '../interfaces/recycle.interface';
import { SortEnum } from '@/document/dto/document.dto';

export class RecycleListQueryDto {
  @ApiPropertyOptional({ description: '名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '类型', enum: RecycleTypeEnum })
  @IsOptional()
  @IsEnum(RecycleTypeEnum)
  type?: RecycleTypeEnum;

  @ApiPropertyOptional({ description: '排序', enum: RecycleSortField })
  @IsOptional()
  @IsEnum(RecycleSortField)
  sort?: RecycleSortField;

  @ApiPropertyOptional({ description: '升序/降序', enum: SortEnum })
  @IsOptional()
  @IsEnum(SortEnum)
  sortType?: SortEnum;
}

export class RecycleIdListDto {
  @ApiProperty({ description: 'id集合', type: [Number] })
  @ArrayNotEmpty()
  @IsArray()
  @IsInt({ each: true })
  ids: number[];
}

export class RecycleItemDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  source: IRecycleSource;

  @ApiProperty()
  expiry: Date;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  createTime: Date;
}
