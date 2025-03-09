import { All, Body, Controller, Get, Logger, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import {
  ApiResponseWrapper,
  BinaryFile,
  Internal,
  Page,
  PageDto,
  Public,
  User,
  UserRole,
  ValidatorFilePipe,
} from '@/common/decorators';
import axios from 'axios';
import { timeout } from '@/common/constant';
import { IUser, IUserRole } from '@/user/interfaces/user.interface';
import { ManagerService } from './manager.service';
import {
  GlobalSearchDto,
  ISmsDto,
  PublicDownloadDto,
  UpdateConfigDto,
  UploadParamsDto,
} from './dto/config.dto';
import { DocAllQueryDto, ExportFilterDto } from './dto/internal.dto';
import { FolderService } from '@/folder/folder.service';
import { DocumentService } from '@/document/document.service';
import { UserService } from '@/user/user.service';

const proxy = axios.create({ timeout, baseURL: process.env.BACKEND_URL });

@ApiTags('公共接口')
@Controller('common')
export class ManagerController {
  constructor(
    private readonly managerService: ManagerService,
    private readonly folderService: FolderService,
    private readonly documentService: DocumentService,
    private readonly userService: UserService
  ) {}

  @Public()
  @ApiOperation({ summary: '配置查询', description: 'concept概念/industry行业/financeType类型...' })
  @ApiResponseWrapper({ type: UpdateConfigDto })
  @Get('/config/detail')
  detail(@Query('key') key: string) {
    return this.managerService.detail(key);
  }

  @UserRole([IUserRole.admin])
  @ApiOperation({ summary: '配置修改' })
  @ApiResponseWrapper({ type: UpdateConfigDto })
  @Post('/config/update')
  update(@Body() configItem: UpdateConfigDto) {
    return this.managerService.update(configItem);
  }

  @UserRole([IUserRole.admin])
  @ApiOperation({ summary: '上传静态资源' })
  @ApiConsumes('application/octet-stream')
  @ApiBody({ schema: { format: 'binary' } })
  @Post('/public/upload')
  async publicUpload(
    @BinaryFile(new ValidatorFilePipe())
    file: Express.Multer.File,
    @Query() params: UploadParamsDto
  ) {
    return this.managerService.publicUpload(file.buffer, params);
  }

  @Public()
  @ApiOperation({
    summary: '静态资源下载',
    description: '封面：cover + 文档uuid;\n 头像：avatar + 用户id;\n 为空：公开的静态资源',
  })
  @Get('/public/download')
  publicDownload(@Query() data: PublicDownloadDto, @Res() res) {
    return this.managerService.publicDownload(data, res);
  }

  @Public()
  @ApiOperation({ summary: '发送短信验证码' })
  @Post('/sms')
  async sendSMS(@Body() data: ISmsDto) {
    return await this.managerService.sendSMS(data);
  }

  @ApiOperation({ summary: '全局搜索' })
  @Post('/global/search')
  async globalSearch(
    @Body() data: GlobalSearchDto,
    @Page('body') page: PageDto,
    @User() user: IUser
  ) {
    return await this.managerService.globalSearch(data, page, user);
  }

  @ApiOperation({ summary: 'pdf to word' })
  @ApiConsumes('application/octet-stream')
  @ApiBody({ schema: { format: 'binary' } })
  @Post('/pdf-to-word')
  async pdfToWord(@Query() query, @BinaryFile() file, @Res() res) {
    return await this.managerService.pdfToWord(query, file, res);
  }

  @ApiOperation({ summary: 'pdf to word v2' })
  @ApiConsumes('application/octet-stream')
  @ApiBody({ schema: { format: 'binary' } })
  @Post('/pdf-to-word/v2')
  async pdfToWordV2(@Query() query, @BinaryFile() file, @Res() res) {
    return await this.managerService.pdfToWordV2(query, file, res);
  }

  // @Internal()
  // @ApiOperation({ summary: '导出questions' })
  // @Post('/questions/export')
  // async questionsExport(@Body() data: ExportFilterDto, @Res() res: Response) {
  //   return await this.managerService.questionsExport(data, res);
  // }

  @Internal()
  @ApiOperation({ summary: '获取所有文档' })
  @Post('/document/all')
  listAll(@Body() data: DocAllQueryDto) {
    return this.managerService.listAllDoc(data);
  }

  @Post('/delete/all')
  async deleteAll() {
    const users = await this.userService.findAll();
    const execute = async () => {
      const total = users?.length || 0;
      let i = 0;
      for (const user of users) {
        const p1 = this.folderService.deleteByAdmin(user.id).catch((err) => {
          console.log('err', err);
        });
        const p2 = this.documentService.deleteByAdmin(user.id).catch((err) => {
          console.log('err', err);
        });
        await Promise.all([p1, p2]);
        i++;
        Logger.log(`[${i}/${total}] 用户${user.id}`, '完成删除用户所有文件夹和文件');
      }
    };
    execute();
    return 'ok';
  }

  @Internal()
  @ApiExcludeEndpoint()
  @All('/proxy/*')
  proxy(@Req() req, @Res() res) {
    proxy({
      url: req.url.replace(new RegExp('/api/v1/common/proxy/'), ''),
      method: req.method,
      params: req.params,
      data: req.body,
    })
      .then(({ data }) => {
        res.status(200).json(data);
      })
      .catch((err) => {
        if (err.response) {
          const { response } = err;
          res.status(response.status).send(response.data);
        } else {
          Logger.error(err, 'proxy error');
          res.status(500).send(err.message);
        }
      });
  }
}
