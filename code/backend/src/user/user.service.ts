import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  In,
  IsNull,
  Like,
  MoreThanOrEqual,
  QueryRunner,
  Repository,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Response } from 'express';
import * as dayjs from 'dayjs';
import * as _ from 'lodash';
import { sms, storagePath, tokenExpiry, tokenKey } from '@/common/constant';
import {
  resizeImage,
  uploadToStorage,
  filterEmpty,
  generateRandomStr,
  throwError,
  toCamelCase,
  toSnakeCase,
} from '@/common/utils';
import { User } from './entities/user.entity';
import { Token } from './entities/token.entity';
import {
  ForceUpdateUserInfoDto,
  SearchUserInfoDto,
  UpdateUserInfoDto,
  UpdateUserKeyInfoDto,
  UserLoginDto,
  UserRegisterDto,
  UserSortDto,
  UserUpdatePassword,
} from './dto/user.dto';
import { IUser, IUserRole, IUserStatus } from './interfaces/user.interface';
import { Code } from '@/manager/entities/code.entity';
import { Library } from '@/library/entities/library.entity';
import { LibraryType } from '@/library/interfaces/library.interface';
import { IPage } from '@/common/decorators';
import { SortEnum } from '@/document/dto/document.dto';
import { generateUuid, hashPassword } from '@/utils/util';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Folder } from '@/folder/entities/folder.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
    @InjectRepository(Code)
    private codeRepository: Repository<Code>,
    private dataSource: DataSource
  ) {}

  async findAll() {
    return await this.userRepository.findBy({ deleteTime: IsNull() });
  }

  async getUserByMobile(mobile: string) {
    return await this.userRepository.findOneBy({ mobile });
  }

  // 账号密码登录
  async loginWithPassword(data: UserLoginDto, response: Response) {
    const userInfo = await this.userRepository
      .createQueryBuilder('user')
      .addSelect(['user.password', 'user.salt'])
      .where([
        { account: data.account },
        { mobile: data.mobile || data.account },
        { email: data.email || data.account },
      ])
      .getOne();
    if (!userInfo) {
      throw new BadRequestException('账号或密码错误');
    }
    const { password, salt, ...user } = userInfo;
    if (!user) {
      throw new BadRequestException('账号或密码错误');
    }

    // 失败次数大于固定次数，禁止登录
    const loginFailedCount = await this.findLoginFailedCount(userInfo);
    const totalRetryCount = 10;
    if (loginFailedCount >= totalRetryCount) {
      throw new BadRequestException('登录失败次数过多，请稍后再试');
    }

    const pwd = hashPassword(data.password, salt);
    if (password === pwd) {
      return this.setToken(user, response);
    } else {
      // 增加登录失败次数
      await this.setLoginFailedCount(userInfo);
      throw new BadRequestException(`账号或密码错误`);
    }
  }

  async createNewUser(data: UserLoginDto, response: Response) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    let result;
    try {
      // 用户不存在，直接注册
      const newUser = {
        account: data.account || (await this.generateAccount()),
        role: IUserRole.user,
        salt: generateUuid(),
        mobile: data.mobile,
        mobileAreaCode: data.mobileAreaCode,
        email: data.email,
        name: data.name,
        openid: data.openid,
      };
      const userId = await this.registerCore(queryRunner, newUser);
      // 登录
      result = await this.setToken(
        { id: userId, status: IUserStatus.normal },
        response,
        queryRunner
      );
      await queryRunner.commitTransaction();
      const currentNewUser = await this.userRepository.findOneBy({ id: userId });
      result = { ...currentNewUser, token: result.token };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      result = error;
    } finally {
      await queryRunner.release();
    }
    throwError(result);
    return result;
  }

  // 短信验证码登录
  async loginWithSMS(data: UserLoginDto, response: Response) {
    let userInfo = await this.userRepository.findOneBy({ mobile: data.mobile });
    // 失败次数大于固定次数，禁止登录
    const loginFailedCount = await this.findLoginFailedCount(userInfo);
    const totalRetryCount = 10;
    if (loginFailedCount >= totalRetryCount) {
      throw new ForbiddenException('登录失败次数过多，请稍后再试');
    }
    if (!(await this.validateSMS(data))) {
      if (userInfo) {
        // 增加登录失败次数
        await this.setLoginFailedCount(userInfo);
      } else {
        // 新用户判断是否发送过验证码
        if (await this.validateSendSMS(data)) {
          data.loginFailedCount = 1;
          await this.createNewUser(data, response);
        }
      }
      throw new BadRequestException('验证码无效');
    }
    if (userInfo) {
      // 登录成功，失败次数清零
      await this.setLoginFailedCount(userInfo, 0);
      return this.setToken(userInfo, response);
    } else {
      const result = await this.createNewUser(data, response);
      userInfo = await this.userRepository.findOneBy({ mobile: data.mobile });
      return { ...result, ...userInfo };
    }
  }

  /**
   * 定时任务, 每天执行登录失败次数清零
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetLoginFailedCount() {
    this.userRepository.findBy({ loginFailedCount: MoreThanOrEqual(1) }).then((users) => {
      users.forEach((user) => {
        this.userRepository.update(user.id, { id: user.id, loginFailedCount: 0 });
      });
    });
  }

  async setToken(user: Partial<IUser>, response: Response, queryRunner?: QueryRunner) {
    const token = generateUuid();
    if (user.status === IUserStatus.disabled) {
      throw new ForbiddenException('账号失效');
    }
    const tokenEntity = {
      token,
      expiry: dayjs().add(tokenExpiry, 'milliseconds').toDate(),
      userId: user.id,
    };
    if (queryRunner) {
      await queryRunner.manager.insert(Token, tokenEntity);
    } else {
      await this.tokenRepository.insert(tokenEntity);
    }
    response.cookie(tokenKey, token, {
      maxAge: tokenExpiry,
      secure: true,
      domain: process.env.COOKIE_DOMAIN,
    });
    return { ...user, token };
  }

  // 校验短信验证码
  async validateSMS(data: UserLoginDto) {
    const user = `${data.mobileAreaCode || sms.area_code} ${data.mobile}`;
    const record = await this.dataSource
      .createQueryBuilder(Code, 'code')
      .where({ user, code: data.code, expiry: MoreThanOrEqual(new Date()) })
      .getCount();
    return !!record;
  }

  /**
   * 是否发送过验证码
   */
  async validateSendSMS(data: UserLoginDto) {
    const user = `${data.mobileAreaCode || sms.area_code} ${data.mobile}`;
    const record = await this.dataSource
      .createQueryBuilder(Code, 'code')
      .where({ user, expiry: MoreThanOrEqual(new Date()) })
      .getCount();
    return !!record;
  }

  async validateToken(token: string) {
    if (!token) return null;
    const tokenRow = await this.tokenRepository.findOneBy({
      token,
      expiry: MoreThanOrEqual(new Date()),
    });
    if (tokenRow) {
      const userInfo = await this.userRepository.findOneBy({ id: tokenRow.userId });
      if (userInfo && userInfo.status !== IUserStatus.disabled) return userInfo;
    }
    return null;
  }

  async deleteUserToken(userId: number) {
    const tokens = await this.tokenRepository.findBy({ userId });
    await this.tokenRepository.remove(tokens);
  }

  async logout(response: Response, token: string) {
    await this.tokenRepository.delete(token);
    response.clearCookie(tokenKey);
    return true;
  }

  async register(data: UserRegisterDto) {
    const userKeys = Object.keys(_.pick(data, ['account', 'mobile', 'email']));
    const isExit =
      userKeys.length &&
      (await this.userRepository.findOneBy(userKeys.map((key) => ({ [key]: data[key] }))));
    if (isExit) {
      throw new BadRequestException('账号已存在');
    }
    const salt = generateUuid();
    let account = data.account;
    if (!account) {
      account = await this.generateAccount();
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    let result;
    try {
      const newUser = {
        ...data,
        account,
        password: hashPassword(data.password, salt),
        salt,
        role: IUserRole.user,
      };
      result = await this.registerCore(queryRunner, newUser);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      result = error;
    } finally {
      await queryRunner.release();
    }
    throwError(result);
    return await this.userRepository.findOneBy({ id: result });
  }

  async registerCore(queryRunner: QueryRunner, data: Partial<User>): Promise<number> {
    const { identifiers: identifiersUser } = await queryRunner.manager.insert(User, data);
    const userId = identifiersUser[0].id;
    // 注册时创建用户的自定义知识库
    const { identifiers: identifiersLibrary } = await queryRunner.manager.insert(Library, {
      name: '我的知识库',
      note: '系统自动创建的自定义知识库',
      type: LibraryType.custom,
      userId: userId,
    });
    // 注册时创建用户的第一个文件夹
    await queryRunner.manager.insert(Folder, {
      name: '默认文件夹',
      libraryId: identifiersLibrary[0].id,
      userId: userId,
      sort: 1,
    });
    return userId;
  }

  // 创建6字母位的account
  async generateAccount() {
    const accountLength = 6;
    let account = generateRandomStr(accountLength);
    while ((await this.userRepository.countBy({ account })) > 0) {
      account = generateRandomStr(accountLength);
    }
    return account;
  }

  async updatePassword(data: UserUpdatePassword, user: IUser) {
    let account = user.account;
    // admin可以修改所有人的密码
    if ([IUserRole.admin].includes(user.role) && data.account) {
      account = data.account;
    }
    const userInfo = await this.userRepository.findOneBy({ account });
    if (userInfo) {
      const salt = generateUuid();
      await this.userRepository.update(userInfo.id, {
        id: userInfo.id,
        password: hashPassword(data.newPassword, salt),
        salt,
      });
      await this.deleteUserToken(userInfo.id);
      return userInfo;
    } else {
      throw new BadRequestException('账号不存在');
    }
  }

  async updateKeyInfo(data: UpdateUserKeyInfoDto) {
    const userInfo = await this.userRepository.findOneBy({ id: data.id });
    if (userInfo) {
      const newData: QueryDeepPartialEntity<User> = { id: userInfo.id, ...filterEmpty(data) };
      if (userInfo.account === 'admin' && newData.account && newData.account !== 'admin') {
        throw new ForbiddenException('该账号名不可修改');
      }
      await this.userRepository.update(userInfo.id, newData);
      await this.deleteUserToken(userInfo.id);
    } else {
      throw new BadRequestException('账号不存在');
    }
    return await this.userRepository.findOneBy({ id: data.id });
  }

  async updateInfo(data: UpdateUserInfoDto, user: IUser) {
    await this.userRepository.update(user.id, { id: user.id, ...data });
    return await this.userRepository.findOneBy({ id: user.id });
  }
  async forceUpdateInfo(data: ForceUpdateUserInfoDto, user: IUser) {
    await this.userRepository.update(user.id, { id: user.id, ...data });
    return await this.userRepository.findOneBy({ id: user.id });
  }

  async avatarUpload(file: Buffer, user: IUser) {
    const sharpImg = await resizeImage(file, { width: 200, height: 200 });
    const fileData = sharpImg.length < file.length ? sharpImg : file;
    await uploadToStorage(user.id, fileData, `${storagePath.avatar}/`);
    // await this.userRepository.update(user.id, { id: user.id, avatar: `${user.id}` });
    return user.id;
  }

  async detail(id: number) {
    const data = await this.userRepository
      .createQueryBuilder('user')
      .addSelect(['user.password'])
      .where({ id })
      .getOne();
    data['hasPassword'] = !!data['password'];
    delete data.password;
    return toCamelCase(data);
  }

  async list() {
    return await this.userRepository.find();
  }

  async listByPage(
    data: SearchUserInfoDto,
    { skip, take }: IPage,
    sort: UserSortDto = { createTime: SortEnum.DESC }
  ) {
    const qb = this.userRepository.createQueryBuilder('user');
    if (data.id) {
      qb.where({ id: data.id });
    }
    if (data.account) {
      qb.where({ account: Like(`%${data.account}%`) });
    }
    if (data.mobile) {
      qb.where({ mobile: Like(`%${data.mobile}%`) });
    }
    if (data.role) {
      qb.where({ role: In(data.role) });
    }
    if (data.status) {
      qb.where({ status: data.status });
    }
    if (data.createTime?.length) {
      qb.where({ createTime: Between(data.createTime[0], data.createTime[1]) });
    }
    if (sort) {
      qb.orderBy(filterEmpty(toSnakeCase(sort)));
    }
    qb.addOrderBy('id', 'DESC');
    qb.offset(skip).limit(take);
    const [list, total] = await qb.getManyAndCount();
    return { list, total };
  }

  /**
   * 登录失败次数 默认 + 1
   * 指定count, 则设置为count
   * @param user
   * @param count
   */
  async setLoginFailedCount({ id }: User, count?: number) {
    this.userRepository.findOneBy({ id }).then((user) => {
      if (user) {
        this.userRepository.update(id, {
          id,
          loginFailedCount: count ?? (user.loginFailedCount || 0) + 1,
        });
      }
    });
  }

  async findLoginFailedCount(user?: User) {
    if (!user) {
      return 0;
    }
    const { id } = user;
    const currUser = await this.userRepository.findOneBy({ id });
    return currUser?.loginFailedCount || 0;
  }
}
