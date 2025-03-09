import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  ParseArrayPipe,
  Ip,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Express } from 'express';
import {
  ApiPaginatedResponse,
  ApiResponseWrapper,
  BinaryFile,
  Internal,
  Page,
  PageDto,
  PaginatedDto,
  Public,
  User,
  UserRole,
  ValidatorFilePipe,
} from '@/common/decorators';
import { IUser, IUserRole } from '@/user/interfaces/user.interface';
import { DocumentService } from './document.service';
import {
  CallbackDto,
  DocumentFolderMoveDto,
  CreateFianceDocumentDto,
  DocumentDto,
  DocumentDtoDetailDto,
  DocumentSortDto,
  DownloadQueryDto,
  FilterConfigDto,
  FinanceDocumentQueryDto,
  DocIdListDto,
  ListDocBodyDto,
  QueryDetailDto,
  DocSortDto,
  UpdateDocDto,
  UploadQueryDto,
  ListByFilterDto,
  DocSummaryDto,
  DocHandleParams,
  ListByUserDto,
} from './dto/document.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentType } from './interfaces/document.interface';
import { GlobalChatService } from '@/chat/global_chat.service';
import { CacheInterceptor } from '@nestjs/cache-manager';

@ApiTags('文档')
@Controller('document')
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly globalChatService: GlobalChatService
  ) {}

  @UserRole([IUserRole.admin, IUserRole.manager])
  @ApiOperation({ summary: '创建财报知识库文档' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiResponseWrapper({ type: DocumentDto })
  @Post('/finance/upload')
  async createFiance(
    @UploadedFile(new ValidatorFilePipe())
    file: Express.Multer.File,
    @Body() document: CreateFianceDocumentDto,
    @Query() handleParams: DocHandleParams,
    @User() user: IUser
  ) {
    return await this.documentService.createFiance(
      {
        ...document,
        type: DocumentType.library,
        updateBy: user.id,
        documentSize: file.size,
      },
      file.buffer,
      file.mimetype,
      handleParams
    );
  }

  @ApiOperation({ summary: '上传自定义知识库文档' })
  @ApiConsumes('application/octet-stream')
  @ApiBody({ schema: { format: 'binary' } })
  @ApiResponseWrapper({ type: DocumentDto })
  @Post('/upload')
  async upload(
    @BinaryFile(new ValidatorFilePipe())
    file: Express.Multer.File,
    @Query() data: UploadQueryDto,
    @Query() handleParams: DocHandleParams,
    @User() user: IUser
  ) {
    return this.documentService.createDocument(
      { ...data, type: DocumentType.user, userId: user.id, documentSize: file.size },
      file.buffer,
      file.mimetype,
      handleParams
    );
  }

  @Public()
  @ApiOperation({ summary: '系统知识库文档分页查询' })
  @ApiBody({ type: ListDocBodyDto })
  @ApiPaginatedResponse(DocumentDtoDetailDto)
  @Post('/list')
  list(
    @Body() filter: FinanceDocumentQueryDto,
    @Page('body') page: PageDto,
    @Body('sort') sort: DocSortDto,
    @User() user: IUser
  ): Promise<PaginatedDto<DocumentDtoDetailDto>> {
    return this.documentService.listLibraryDoc(filter, page, sort, user);
  }

  @ApiOperation({ summary: '用户通过ids/filename查询文档' })
  @ApiResponseWrapper({ type: DocumentDtoDetailDto, isArray: true })
  @Post('/list/by/filter')
  listByIds(@Body() data: ListByFilterDto, @User() user: IUser) {
    return this.documentService.listLibraryDocByIds(data, user);
  }

  @ApiOperation({ summary: '用户通过uuids查询文档' })
  @ApiResponseWrapper({ type: DocumentDtoDetailDto, isArray: true })
  @Post('/list/by')
  listByUuids(@Body() data: ListByFilterDto, @User() user: IUser) {
    if (!data?.uuids?.length) return [];
    return this.globalChatService.listLibraryDocByUuids(data.uuids, user);
  }

  @ApiOperation({ summary: 'id查询' })
  @Get('/info')
  getInfo(@Query() data: { id: number }, @User() user: IUser) {
    return this.documentService.getInfo(data, user);
  }

  @Public()
  @ApiOperation({ summary: '查询企业知识库' })
  @ApiResponseWrapper({ type: DocumentDtoDetailDto, isArray: true })
  @Post('/list/public')
  InternalListByIds(@Body() data: ListByFilterDto) {
    data.type = DocumentType.library;
    return this.documentService.listLibraryDocByIds(data);
  }

  @ApiOperation({ summary: '查询个人知识库' })
  @ApiResponseWrapper({ type: DocumentDtoDetailDto, isArray: true })
  @Post('/list/personal')
  listByUser(@Body() data: ListByUserDto, @Page('body') page: PageDto, @User() user: IUser) {
    if (user?.role !== IUserRole.admin) {
      throw new ForbiddenException('无权限');
    }
    return this.documentService.listByUser(data, page);
  }

  @ApiOperation({ summary: '文档删除' })
  @ApiResponseWrapper({ type: 'boolean' })
  @Post('/delete')
  async delete(@Body() deleteDto: DocIdListDto, @User() user: IUser) {
    return this.documentService.delete(deleteDto.ids, user);
  }

  @Post('/admin/delete')
  async deleteByAdmin(@Body() deleteDto: { userId: number }) {
    return await this.documentService.deleteByAdmin(deleteDto.userId);
  }

  @ApiOperation({ summary: '修改文档所属文件夹' })
  @ApiBody({ type: [DocumentFolderMoveDto] })
  @ApiResponseWrapper({ type: 'boolean' })
  @Post('/move')
  async move(
    @Body(new ParseArrayPipe({ items: DocumentFolderMoveDto }))
    folderData: DocumentFolderMoveDto[],
    @User() user: IUser
  ) {
    return await this.documentService.move(folderData, user);
  }

  @ApiOperation({ summary: '修改文档信息' })
  @ApiResponseWrapper({ type: DocumentDto })
  @Post('/update')
  async update(@Body() data: UpdateDocDto, @User() user: IUser) {
    return await this.documentService.update(data, user);
  }

  @ApiOperation({ summary: '修改文档/文件夹顺序' })
  @ApiBody({ type: [DocumentSortDto] })
  @ApiResponseWrapper({ type: 'boolean' })
  @Post('/folder/sort')
  async sort(
    @Body(new ParseArrayPipe({ items: DocumentSortDto })) sortData: DocumentSortDto[],
    @User() user: IUser
  ) {
    return await this.documentService.sort(sortData, user);
  }

  @ApiOperation({ summary: '文档重新解析' })
  @ApiResponseWrapper({ type: 'boolean' })
  @Get('/reparse')
  reparse(@Query() data: QueryDetailDto, @User() user: IUser) {
    return this.documentService.reparse(data.id, user);
  }

  @ApiOperation({ summary: '文档下载' })
  @Get('/download')
  download(@Query() data: DownloadQueryDto, @Res() res, @User() user: IUser) {
    return this.documentService.download(data, res, user);
  }

  @Internal()
  @ApiOperation({ summary: '文档状态回调' })
  @Get('/callback')
  getCallback(@Query() data: CallbackDto) {
    return this.documentService.callback(data);
  }

  @Internal()
  @ApiOperation({ summary: '文档状态回调' })
  @Post('/callback')
  postCallback(@Body() data: CallbackDto) {
    return this.documentService.callback(data);
  }

  @Public()
  @ApiOperation({
    summary: '文档概要更新/查询',
    description: '查询: id; 保存: uuid + data; 重新生成: id + regeneration',
  })
  @Post('/summary')
  summary(@Body() data: DocSummaryDto, @Ip() ip: string, @User() user: IUser) {
    return this.documentService.summary(data, ip, user);
  }

  @Public()
  @ApiOperation({ summary: '文档的查询配置' })
  @ApiResponseWrapper({ type: FilterConfigDto })
  @Get('/filter/config')
  @UseInterceptors(CacheInterceptor)
  filterConfigList() {
    return this.documentService.filterConfigList();
  }
}
