import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import {
  Between,
  DataSource,
  FindOptionsWhere,
  In,
  LessThanOrEqual,
  Like,
  MoreThanOrEqual,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { Readable, Stream } from 'stream';
import { Response } from 'express';
import * as dayjs from 'dayjs';
import { sms, storagePath } from '@/common/constant';
import { fetch } from '@/common/request';
import { generateRandomStr, md5, uploadToStorage } from '@/common/utils';
import { IPage, IUser } from '@/common/decorators';
import {
  GlobalSearchDto,
  ISmsDto,
  PublicDownloadDto,
  UpdateConfigDto,
  UploadParamsDto,
} from './dto/config.dto';
import { Config } from './entities/config.entity';
import { Code } from './entities/code.entity';
import { Log } from './entities/log.entity';
import { DownloadType, ICodeType } from './interfaces/config';
import { Document } from '@/document/entities/document.entity';
import { DocumentType } from '@/document/interfaces/document.interface';
import { DocAllQueryDto, ExportFilterDto } from './dto/internal.dto';
import { Content } from '@/chat/entities/content.entity';
import { ContentType } from '@/chat/interfaces/chat.interface';
import { Chat } from '@/chat/entities/chat.entity';
import { Folder } from '@/folder/entities/folder.entity';
import { Cache } from 'cache-manager';
import { getStreamByBase64 } from '@/common/utils/image';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class ManagerService {
  constructor(
    @InjectRepository(Config)
    private configRepository: Repository<Config>,
    @InjectRepository(Code)
    private codeRepository: Repository<Code>,
    @InjectRepository(Log)
    private logRepository: Repository<Log>,
    private dataSource: DataSource,
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache
  ) {}

  async update(configItem: UpdateConfigDto) {
    return await this.configRepository.save(configItem);
  }

  async detail(key: string) {
    const manager = await this.configRepository.findOneBy({ key });
    if (!manager) {
      throw new NotFoundException(`配置: ${key} 不存在`);
    }
    return manager;
  }

  async publicUpload(file: Buffer, params: UploadParamsDto) {
    const uuid = params.uuid || md5(file);
    const path = params.type || storagePath.public;
    await uploadToStorage(uuid, file, path.replace(/\/$/, '') + '/');
    return uuid;
  }

  async publicDownload({ type, path }: PublicDownloadDto, response: Response) {
    const cacheKey = type + '_' + path;
    const pngBase64: string = await this.cacheManager.store.get(cacheKey);
    if (pngBase64) {
      const axiosResponse = await getStreamByBase64(pngBase64, 'image/png');
      response.setHeader('Content-Type', 'image/png');
      response.setHeader('cache-control', 'max-age=31536000');
      axiosResponse.data.pipe(response);
      return;
    }
    const url = process.env.DOWNLOAD_ADDRESS;
    let fileUrl = url + `${storagePath.public}/${path}`;
    if (type === DownloadType.avatar) {
      fileUrl = url + `${storagePath.avatar}/${path}`;
    } else if (type === DownloadType.cover) {
      fileUrl = url + `${storagePath.cover}/${path}`;
    }
    const axiosResponse: AxiosResponse<Stream> = await firstValueFrom(
      this.httpService.get(fileUrl, { responseType: 'stream' })
    );
    if ([DownloadType.avatar, DownloadType.cover].includes(type)) {
      response.setHeader('Content-Type', 'image/png');
    } else {
      response.setHeader('Content-Type', 'application/octet-stream');
    }
    const hasSuffix = /\.[a-zA-Z]+$/.test(path);
    if (hasSuffix) {
      const suffix = path.split('.').pop();
      if (['png', 'jpg', 'jpeg'].includes(suffix)) {
        response.setHeader('Content-Type', `image/${suffix}`);
      } else {
        response.setHeader(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(path)}"`
        );
      }
    }
    response.setHeader('cache-control', 'max-age=31536000');
    axiosResponse.data.pipe(response);
    const chunks: Buffer[] = [];
    axiosResponse.data.on('data', (chunk) => chunks.push(chunk));
    axiosResponse.data.on('end', () => {
      const imageData = Buffer.concat(chunks).toString('base64');
      this.cacheManager.store.set(cacheKey, imageData);
    });
  }

  async sendSMS({ mobile, mobileAreaCode }: ISmsDto) {
    // 发送次数&频率限制
    const LIMIT = {
      limit1: { rangeTime: 30, rangeCount: 5 }, // 30 min
      limit2: { rangeTime: 24, rangeCount: 10 }, // 24 hour
      interval: 1,
      expiry: 5, // 验证码有效期 5 min
    };
    const area_code = mobileAreaCode || sms.area_code;
    const userMobile = `${area_code} ${mobile}`;
    const records = await this.codeRepository.find({
      where: { user: userMobile, createTime: dayjs().subtract(24, 'hours').toDate() },
      order: { createTime: 'DESC' },
    });
    // 发送间隔为60s
    const now = Date.now();
    const recentRecord = records[0];
    if (
      recentRecord &&
      now - new Date(recentRecord.createTime).getTime() < 1000 * 60 * LIMIT.interval
    ) {
      Logger.warn(`[${mobile}]验证码发送太频繁`, '短信验证码');
      throw new BadRequestException(`发送太频繁，请稍后再试`);
    }
    // 发送次数上限，30分钟5次
    const records1 = records.filter(
      (row) => now - new Date(row.createTime).getTime() <= 1000 * 60 * LIMIT.limit1.rangeTime
    );
    if (records1.length >= LIMIT.limit1.rangeCount) {
      Logger.warn(
        `[${mobile}]验证码发送达到上限[${LIMIT.limit1.rangeTime}分钟${LIMIT.limit1.rangeCount}次]`,
        '短信验证码'
      );
      throw new BadRequestException(`发送太频繁，请稍后再试`);
    }
    // 24小时10次
    if (records.length >= LIMIT.limit2.rangeCount) {
      Logger.warn(
        `[${mobile}]验证码发送达到上限[${LIMIT.limit2.rangeTime}小时${LIMIT.limit2.rangeCount}次]`,
        '短信验证码'
      );
      throw new BadRequestException(`发送太频繁，请稍后再试`);
    }
    const url = process.env.SMS_ADDRESS;
    const sign = md5(
      `area_code=${area_code}&client_id=${sms.client_id}&mobile=${mobile}&template=${sms.template}&key=${sms.key}`
    ).toLowerCase();
    const verifyCode = generateRandomStr(6, 'number');
    const { data } = await fetch.post(
      url + '/internal/sms/proxy/send',
      `tokens=${JSON.stringify({ TOKEN: verifyCode })}`,
      {
        params: {
          sign,
          mobile,
          area_code,
          client_id: sms.client_id,
          template: sms.template,
        },
      }
    );
    if (data.ret === 0 || data.ret === '0') {
      await this.codeRepository.insert({
        code: verifyCode,
        type: ICodeType['sms-login'],
        user: userMobile,
        expiry: dayjs().add(5, 'minutes').toDate(),
        response: data.data?.trace_token,
      });
      Logger.log(`[${mobile}]验证码发送成功`, '短信验证码');
    } else {
      Logger.error(`[${mobile}]验证码发送失败:${data.err}`, '短信验证码');
      throw new InternalServerErrorException(data);
    }
    return true;
  }

  async globalSearch({ keywords }: GlobalSearchDto, { skip, take }: IPage, user: IUser) {
    const query1 = this.dataSource
      .createQueryBuilder(Folder, 'folder')
      .select(['id', 'name', '"folder" as type'])
      .where({ name: Like(`%${keywords}%`), userId: user.id });
    const query2 = this.dataSource
      .createQueryBuilder(Document, 'document')
      .select(['id', 'name', '"document" as type'])
      .where({ name: Like(`%${keywords}%`), updateBy: user.id, type: DocumentType.user });
    const query3 = this.dataSource
      .createQueryBuilder(Content, 'content')
      .select(['id', 'content as name', '"chat" as type'])
      .where({ content: Like(`%${keywords}%`), userId: user.id, type: ContentType.question });
    const fromData = [query1.getQuery(), query2.getQuery(), query3.getQuery()].join(' UNION ALL ');
    const params = {
      ...query1.getParameters(),
      ...query2.getParameters(),
      ...query3.getParameters(),
    };
    const list = await this.dataSource
      .createQueryBuilder()
      .select()
      .from(`(${fromData})`, 'data')
      .setParameters(params)
      .offset(skip)
      .limit(take)
      .execute();
    const count = await this.dataSource
      .createQueryBuilder()
      .select('count(*)', 'total')
      .from(`(${fromData})`, 'data')
      .setParameters(params)
      .execute();
    return { list, total: Number(count[0].total) };
  }

  async pdfToWord(params, file, response) {
    const url = process.env.PDF_TO_WORD;
    const axiosResponse: AxiosResponse<Stream> = await firstValueFrom(
      this.httpService.post(url, file.buffer, { params, responseType: 'stream' })
    );
    axiosResponse.data.pipe(response);
  }
  async pdfToWordV2(params, file, response) {
    const url = process.env.CHATDOC_PROXY_URL + '/pdf2word';
    const axiosResponse: AxiosResponse<Stream> = await firstValueFrom(
      this.httpService.post(url, file.buffer, { params, responseType: 'stream' })
    );
    axiosResponse.data.pipe(response);
  }

  async listAllDoc(data: DocAllQueryDto) {
    const query: ObjectLiteral = {};
    if (data.ids?.length) {
      query.id = In(data.ids);
    }
    if (data.uuids?.length) {
      query.uuid = In(data.uuids);
    }
    if (data.filename) {
      query.name = data.filename;
    }
    if (typeof data.type === 'number') {
      query.type = data.type;
    }
    if (typeof data.status === 'number') {
      query.status = data.status;
    }
    const queryBuilder = this.dataSource.createQueryBuilder(Document, 'document').where(query);
    if (data.company) {
      // const companyQueryKey = JSON_EXTRACT(document.extra_data, "$.company")
      const companyQueryKey = 'document.data_company';
      queryBuilder.andWhere(`${companyQueryKey} LIKE :company`, {
        company: `%${data.company}%`,
      });
    }
    if (data.financeDate) {
      const financeDate = data.financeDate;
      // const financeDateQueryKey = `STR_TO_DATE(JSON_EXTRACT(document.extra_data, "$.financeDate"), '"%Y-%m-%dT%H:%i:%s.%fZ"')`;
      /**
       * STR_TO_DATE   将字符串转换为日期格式
       * JSON_UNQUOTE 去除字符串两边的引号
       * JSON_EXTRACT 提取json字符串中的字段值
       */
      // const financeDateQueryKey = `JSON_UNQUOTE(JSON_EXTRACT(document.extra_data, "$.financeDate"))`;
      const financeDateQueryKey = 'document.data_finance_date';
      if (financeDate[0] && financeDate[1]) {
        queryBuilder.andWhere(`${financeDateQueryKey} BETWEEN :startDate AND :endDate`, {
          startDate: financeDate[0].toISOString(),
          endDate: financeDate[1].toISOString(),
        });
      } else if (financeDate[0]) {
        queryBuilder.andWhere(`${financeDateQueryKey} >= :startDate`, {
          startDate: financeDate[0].toISOString(),
        });
      } else if (financeDate[1]) {
        queryBuilder.andWhere(`${financeDateQueryKey} <= :endDate`, {
          endDate: financeDate[1].toISOString(),
        });
      }
    }
    if (data.financeType) {
      // const financeTypeQueryKey = 'JSON_EXTRACT(document.extra_data, "$.financeType")';
      const financeTypeQueryKey = 'document.data_finance_type';
      queryBuilder.andWhere(`${financeTypeQueryKey} IN (:type)`, {
        type: data.financeType,
      });
    }
    if (data.pageNumber) {
      // 2024-07-15 pageNumber 暂未添加虚拟列
      const pageNumber = data.pageNumber;
      const pageNumberQueryKey = `JSON_UNQUOTE(JSON_EXTRACT(document.extra_data, "$.pageNumber"))`;
      if (pageNumber[0] && pageNumber[1]) {
        queryBuilder.andWhere(`${pageNumberQueryKey} BETWEEN :start AND :end`, {
          start: pageNumber[0],
          end: pageNumber[1],
        });
      } else if (pageNumber[0]) {
        queryBuilder.andWhere(`${pageNumberQueryKey} >= :start`, {
          start: pageNumber[0],
        });
      } else if (pageNumber[1]) {
        queryBuilder.andWhere(`${pageNumberQueryKey} <= :end`, {
          end: pageNumber[1],
        });
      }
    }

    return await queryBuilder.getMany();
  }

  async questionsExport(data: ExportFilterDto, response: Response) {
    const { timeRange, feedback, userIds } = data;
    const filterObj: FindOptionsWhere<Content> = { type: ContentType.question };
    if (timeRange) {
      if (timeRange[0] && timeRange[1]) {
        filterObj.createTime = Between(timeRange[0], timeRange[1]);
      } else if (timeRange[0]) {
        filterObj.createTime = MoreThanOrEqual(timeRange[0]);
      } else if (timeRange[1]) {
        filterObj.createTime = LessThanOrEqual(timeRange[1]);
      }
    }
    if (typeof feedback === 'boolean') {
      filterObj.feedback = feedback;
    }
    const queryBuilder = this.dataSource
      .createQueryBuilder(Content, 'content')
      .select(['content'])
      .where(filterObj)
      .leftJoin(Chat, 'chat', 'chat.id = content.chat_id');
    if (userIds) {
      queryBuilder.andWhere('chat.user_id IN(:userIds)', { userIds });
    }
    const queryStream = await queryBuilder.stream();
    const stream = new Readable({ read() {} });
    stream.push('questions\n');
    queryStream.on('data', (chunk: Record<string, string>) => {
      stream.push(chunk.content_content + '\n');
    });
    queryStream.on('end', () => {
      stream.push(null);
    });
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(`questions.csv`)}"`
    );
    stream.pipe(response);
  }
}
