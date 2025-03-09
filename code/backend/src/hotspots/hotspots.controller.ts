import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseWrapper, Public } from '@/common/decorators';
import { HotspotsDetailDto } from './dto/hotspots.dto';
import { HotspotsService } from './hotspots.service';
import { CacheInterceptor, CacheKey } from '@nestjs/cache-manager';

@ApiTags('热门')
@Controller('hotspots')
@UseInterceptors(CacheInterceptor)
export class HotspotsController {
  constructor(private readonly hotspotsService: HotspotsService) {}

  @Public()
  @ApiOperation({ summary: '查询热门内容' })
  @Get('/')
  @CacheKey('hotspots')
  @ApiResponseWrapper({ type: HotspotsDetailDto })
  async getHotspot() {
    return await this.hotspotsService.getLatestOne();
  }
}
