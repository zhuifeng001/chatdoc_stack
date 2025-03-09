import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseWrapper, Public, User, UserRole } from '@/common/decorators';
import { IUser, IUserRole } from '@/user/interfaces/user.interface';
import { LibraryService } from './library.service';
import {
  CreateLibraryDto,
  LibraryDeleteDto,
  LibraryDetailDto,
  LibraryQueryDto,
  LibraryTreeDto,
  UpdateLibraryDto,
} from './dto/library.dto';

@ApiTags('知识库')
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @UserRole(IUserRole.admin)
  @ApiOperation({ summary: '创建知识库' })
  @ApiResponseWrapper({ type: LibraryDetailDto })
  @Post('/add')
  async create(@Body() createLibraryDto: CreateLibraryDto, @User() user: IUser) {
    return await this.libraryService.create(createLibraryDto, user);
  }

  @UserRole(IUserRole.admin)
  @ApiOperation({ summary: '修改知识库' })
  @ApiResponseWrapper({ type: LibraryDetailDto })
  @Post('/update')
  async update(@Body() updateLibraryDto: UpdateLibraryDto, @User() user: IUser) {
    return await this.libraryService.update(updateLibraryDto, user);
  }

  @UserRole(IUserRole.admin)
  @ApiOperation({ summary: '删除知识库' })
  @ApiResponseWrapper({ type: 'boolean' })
  @Post('/delete')
  async delete(@Body() deleteDto: LibraryDeleteDto, @User() user: IUser) {
    return await this.libraryService.delete(deleteDto.ids, user);
  }

  @Public()
  @ApiOperation({ summary: '知识库列表' })
  @ApiResponseWrapper({ type: LibraryDetailDto, isArray: true })
  @Get('/list')
  async list(@Query() data: LibraryQueryDto, @User() user: IUser) {
    return await this.libraryService.list(data, user);
  }

  @ApiOperation({ summary: '自定义知识库树形结构数据' })
  @Post('/data/tree')
  async dataTree(@Body() data: LibraryTreeDto, @User() user: IUser) {
    return await this.libraryService.dataTree(data, user);
  }
}
