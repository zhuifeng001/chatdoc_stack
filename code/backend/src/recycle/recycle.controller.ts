import { Controller, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiPaginatedResponse,
  ApiResponseWrapper,
  IUser,
  Page,
  PageDto,
  User,
} from '@/common/decorators';
import { RecycleService } from './recycle.service';
import { RecycleIdListDto, RecycleItemDto, RecycleListQueryDto } from './dot/recycle.dto';

@ApiTags('回收站')
@Controller('recycle')
export class RecycleController {
  constructor(private readonly recycle: RecycleService) {}

  @ApiOperation({ summary: '回收站列表分页查询' })
  @ApiPaginatedResponse(RecycleItemDto)
  @Post('/list')
  async recycleList(
    @Body() recycleDto: RecycleListQueryDto,
    @Page('body') page: PageDto,
    @User() user: IUser
  ) {
    return this.recycle.recycleList(recycleDto, page, user);
  }

  @ApiOperation({ summary: '回收站恢复' })
  @ApiResponseWrapper({ type: 'boolean' })
  @Post('/restore')
  async recycleRestore(@Body() recycleDto: RecycleIdListDto, @User() user: IUser) {
    return this.recycle.recycleRestore(recycleDto.ids, user);
  }

  @ApiOperation({ summary: '回收站删除' })
  @ApiResponseWrapper({ type: 'boolean' })
  @Post('/delete')
  async recycleDelete(@Body() recycleDto: RecycleIdListDto, @User() user: IUser) {
    return this.recycle.recycleDelete(recycleDto.ids, user);
  }
}
