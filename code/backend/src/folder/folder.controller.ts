import { Controller, Post, Body, ParseArrayPipe } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseWrapper, IUser, User } from '@/common/decorators';
import { FolderService } from './folder.service';
import {
  CreateFolderDto,
  FolderDetailDto,
  FolderDeleteDto,
  UpdateFolderDto,
  ChildrenQueryDto,
  MoveFolderDto,
} from './dto/folder.dto';

@ApiTags('文件夹')
@Controller('folder')
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @ApiOperation({ summary: '创建文件夹' })
  @ApiResponseWrapper({ type: FolderDetailDto })
  @Post('/add')
  async create(@Body() createFolder: CreateFolderDto, @User() user: IUser) {
    return await this.folderService.create({ ...createFolder, userId: user.id });
  }

  @ApiOperation({ summary: '编辑文件夹' })
  @ApiResponseWrapper({ type: FolderDetailDto })
  @Post('/update')
  async update(@Body() updateFolder: UpdateFolderDto, @User() user: IUser) {
    return await this.folderService.update(updateFolder, user);
  }

  @ApiOperation({ summary: '删除文件夹' })
  @ApiResponseWrapper({ type: 'boolean' })
  @Post('/delete')
  async delete(@Body() deleteDto: FolderDeleteDto, @User() user: IUser) {
    return await this.folderService.delete(deleteDto, user);
  }

  @Post('/admin/delete')
  async deleteByAdmin(@Body() deleteDto: { userId: number }) {
    return await this.folderService.deleteByAdmin(deleteDto.userId);
  }

  @ApiOperation({ summary: '移动文件夹位置' })
  @ApiBody({ type: [MoveFolderDto] })
  @ApiResponseWrapper({ type: 'boolean' })
  @Post('/move')
  async move(
    @Body(new ParseArrayPipe({ items: MoveFolderDto })) updateFolder: MoveFolderDto[],
    @User() user: IUser
  ) {
    return await this.folderService.move(updateFolder, user);
  }

  @ApiOperation({ summary: '查询文件夹children' })
  @Post('/data/children')
  async dataChildren(@Body() data: ChildrenQueryDto, @User() user: IUser) {
    if (data.id) {
      return await this.folderService.dataChildren(data, user);
    }
    return await this.folderService.rootDataChildren(data, user);
  }
}
