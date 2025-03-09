import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiBody, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import {
  ApiResponseWrapper,
  BinaryFile,
  IUser,
  Page,
  PageDto,
  Public,
  Token,
  User,
  UserRole,
  ValidatorFilePipe,
} from '@/common/decorators';
import { UserService } from './user.service';
import {
  UpdateUserKeyInfoDto,
  UpdateUserInfoDto,
  UserDetailDto,
  UserLoginDto,
  UserRegisterDto,
  UserUpdatePassword,
  SearchUserInfoDto,
  UserSortDto,
} from './dto/user.dto';
import { IUserRole } from './interfaces/user.interface';

@ApiTags('用户')
@Controller('/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @ApiOperation({ summary: '登录' })
  @ApiBody({ type: UserLoginDto })
  @ApiResponseWrapper({ type: UserDetailDto })
  @Post('/login')
  async login(@Body() data: UserLoginDto, @Res({ passthrough: true }) res) {
    if (data.mobile && data.code) {
      return await this.userService.loginWithSMS(data, res);
    }
    return await this.userService.loginWithPassword(data, res);
  }

  @Public()
  @ApiOperation({ summary: '退出' })
  @ApiResponseWrapper({ type: 'boolean' })
  @Get('/logout')
  async logout(@Res({ passthrough: true }) response: Response, @Token() token: string) {
    return await this.userService.logout(response, token);
  }

  @UserRole(IUserRole.admin)
  @ApiOperation({ summary: '账号密码注册' })
  @ApiBody({ type: UserRegisterDto })
  @ApiResponseWrapper({ type: UserDetailDto })
  @Post('/register')
  async register(@Body() data: UserRegisterDto) {
    return await this.userService.register(data);
  }

  @ApiOperation({ summary: '修改密码' })
  @ApiBody({ type: UserUpdatePassword })
  @ApiResponseWrapper({ type: UserDetailDto })
  @Post('/update/password')
  async updatePassword(@Body() data: UserUpdatePassword, @User() user: IUser) {
    return await this.userService.updatePassword(data, user);
  }

  @UserRole(IUserRole.admin)
  @ApiOperation({ summary: '修改用户关键信息' })
  @ApiBody({ type: UpdateUserKeyInfoDto })
  @ApiResponseWrapper({ type: UserDetailDto })
  @Post('/update/key/info')
  async updateKeyInfo(@Body() data: UpdateUserKeyInfoDto) {
    return await this.userService.updateKeyInfo(data);
  }

  @ApiOperation({ summary: '修改个人信息' })
  @ApiBody({ type: UpdateUserInfoDto })
  @ApiResponseWrapper({ type: UserDetailDto })
  @Post('/update/info')
  async updateInfo(@Body() data: UpdateUserInfoDto, @User() user: IUser) {
    return await this.userService.updateInfo(data, user);
  }

  @ApiOperation({ summary: '修改个人头像' })
  @ApiConsumes('application/octet-stream')
  @ApiBody({ schema: { format: 'binary' } })
  @ApiResponseWrapper({ type: 'string' })
  @Post('/avatar/upload')
  async avatarUpload(
    @BinaryFile(new ValidatorFilePipe({ size: 5, fileType: [/image/] })) file: Express.Multer.File,
    @User() user: IUser
  ) {
    return await this.userService.avatarUpload(file.buffer, user);
  }

  @ApiOperation({ summary: '用户信息' })
  @ApiResponseWrapper({ type: UserDetailDto })
  @Get('/info')
  async detail(@User() user: IUser) {
    return await this.userService.detail(user.id);
  }

  @UserRole(IUserRole.admin)
  @ApiOperation({ summary: '用户列表' })
  @ApiResponseWrapper({ type: UserDetailDto, isArray: true })
  @Get('/list')
  async list() {
    return await this.userService.list();
  }

  @UserRole(IUserRole.admin)
  @ApiBody({ type: SearchUserInfoDto, required: false })
  @ApiOperation({ summary: '用户列表（分页）' })
  @ApiResponseWrapper({ type: UserDetailDto, isArray: true })
  @Post('/listByPage')
  async listByPage(
    @Body() data: SearchUserInfoDto,
    @Page('body') page: PageDto,
    @Body('sort') sort: UserSortDto
  ) {
    return await this.userService.listByPage(data, page, sort);
  }
}
