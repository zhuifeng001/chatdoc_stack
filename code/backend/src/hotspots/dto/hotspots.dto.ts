import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';


export class SpotsDetailDto {
    @ApiPropertyOptional({ description: '热门公司全称' })
    companies?: string[];
  
    @ApiPropertyOptional({ description: '热门公司简称' })
    alias?: string[];
  }

export class HotspotsDetailDto {
    @ApiProperty()
    id: number;
  
    @ApiProperty()
    createTime: Date;
  
    @ApiProperty()
    updateTime: Date;

    @ApiProperty({ description: '热点信息', type: SpotsDetailDto })
    spots: SpotsDetailDto;
}
  
