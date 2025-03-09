import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  FindOptionsWhere,
  In,
  IsNull,
  LessThan,
  LessThanOrEqual,
  Like,
  MoreThanOrEqual,
  Not,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Response } from 'express';
import { AxiosResponse } from 'axios';
import { HttpService } from '@nestjs/axios';
import { Stream } from 'stream';
import { firstValueFrom } from 'rxjs';
import * as dayjs from 'dayjs';
import * as _ from 'lodash';
import * as zlib from 'zlib';
import { IPage, IUser, PageDto } from '@/common/decorators';
import { IUserRole } from '@/user/interfaces/user.interface';
import { Document } from './entities/document.entity';
import { Recycle } from '../recycle/entities/recycle.entity';
import {
  ChatDocDocumentStatus,
  DocumentStatus,
  DocumentStatusMap,
  DocumentType,
  DocumentVisibilityEnums,
  DownloadEnum,
  ICreateDocument,
  IFianDocument,
  IParserParams,
  SaveParams,
  SortTypeEnum,
  docExtraFields,
  financeTypeNameMap,
} from './interfaces/document.interface';
import {
  CallbackDto,
  DocumentFolderMoveDto,
  DocumentSortDto,
  DownloadQueryDto,
  FinanceDocumentQueryDto,
  ListByFilterDto,
  DocSortDto,
  SortEnum,
  UpdateDocDto,
  DocSummaryDto,
  DocHandleParams,
  ListByUserDto,
} from './dto/document.dto';
import { storagePath } from '@/common/constant';
import {
  filterAxiosError,
  filterEmpty,
  getValidName,
  isInternalIp,
  md5,
  nameRegExp,
  resizeImage,
  throwError,
  toCamelCase,
  toSnakeCase,
  uploadToStorage,
} from '@/common/utils';
import { backendRequest, fetch } from '@/common/request';
import { FolderService } from '@/folder/folder.service';
import { Folder } from '@/folder/entities/folder.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Library } from '@/library/entities/library.entity';
import { Config } from '@/manager/entities/config.entity';
import { RecycleTypeEnum } from '@/recycle/interfaces/recycle.interface';
import { LibraryType } from '@/library/interfaces/library.interface';
import { Log } from '@/manager/entities/log.entity';
import { LogEnum } from '@/manager/interfaces/config';
import { formatTree, getSubFolders } from '@/common/utils/tree';
import { pickWithoutEmpty } from '@/utils/util';
import { downloadTextinImage, getStreamByTextinImage } from '@/common/utils/image';
import { isImage } from '@/utils/image';
import { analystKeyword, cutWord, filterWords } from '@/utils/cut-word';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { User } from '@/user/entities/user.entity';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,

    @InjectRepository(Library)
    private libraryRepository: Repository<Library>,
    // private userRepository: Repository<User>,
    private dataSource: DataSource,
    private readonly httpService: HttpService,
    private readonly folderService: FolderService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache
  ) {}

  getInfo(data: Partial<Document>, user: IUser) {
    return this.documentRepository.findOneBy({
      ...data,
      updateBy: user.role === IUserRole.user ? user.id : undefined,
    } as any);
  }

  async parseServer(data: IParserParams, id: number) {
    try {
      const { financeDate, company, industry, financeType } = data.extraData || {};
      let chatdoc_url = '/api/v1/analyst/parse';
      const body = {
        uuid: data.uuid,
        company: company || undefined,
        year: financeDate ? dayjs(financeDate).format('YYYY') : undefined,
        industry: industry ? industry : undefined,
        file_type: financeType ? financeTypeNameMap[financeType] || undefined : undefined,
        knowledge_id: data.type === DocumentType.library ? '0' : `User_${String(data.updateBy)}`,
        ori_type: data.type === DocumentType.library ? '系统知识库' : '个人知识库',
        filename: data.name,
        callback_url: `${process.env.BACKEND_NODE_URL}/api/v1/document/callback`,
        // force_doc_parse: data.force_doc_parse,
        force_doc_parse: true,
      };
      // 个人知识库需要加上user_id
      if (data.type !== DocumentType.library) {
        chatdoc_url = '/api/v1/personal/parse';
        body['user_id'] = String(data.updateBy);
      }

      console.log(JSON.stringify(body));
      backendRequest
        .post(chatdoc_url, body)
        .then(async (res) => {
          this.documentRepository
            .createQueryBuilder()
            .update()
            .set({ extraData: () => `JSON_SET(extraData, '$.traceId', :traceId)` })
            .where({ id: id })
            .setParameters({ traceId: res.data.trace_id })
            .execute();
          if (res.data.status === 'exists') {
            // 直接回调成功
            await this.callback({
              uuid: data.uuid,
              status: ChatDocDocumentStatus.catalog,
              file_meta: res.data.file_meta,
            });
            await this.callback({
              uuid: data.uuid,
              status: ChatDocDocumentStatus.success,
              file_meta: res.data.file_meta,
            });
          }
          Logger.log(data.uuid, '文档开始parse');
        })
        .catch((error) => {
          console.log('parse error', data.name, data.uuid, error);
          filterAxiosError(error);
          Logger.log(error, '文档parse失败');
          this.callback({ uuid: data.uuid, status: ChatDocDocumentStatus.error });
          throwError(error);
        });
    } catch (error) {
      throwError(error);
    }
  }

  async saveHandle(
    createDocument: IFianDocument,
    file: Buffer,
    { unique, type, userId, extraHandle, fileType, handleParams }: SaveParams = {}
  ) {
    const { libraryId, name } = createDocument;
    const uuid = md5(file);
    if (unique && type) {
      const queryParams = {
        uuid,
        libraryId,
        type,
        deleteTime: IsNull(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      if (userId) {
        queryParams.updateBy = userId;
      }
      const doneItm = await this.documentRepository.findOneBy(queryParams);
      if (doneItm) {
        Logger.log(JSON.stringify(doneItm), '文档已存在');
        throw new BadRequestException('该文档已存在');
      }
    }
    await uploadToStorage(uuid, file);
    const extra = extraHandle ? await extraHandle() : {};
    const validName = await this.getValidFilename(name, createDocument);
    const { identifiers } = await this.documentRepository.insert({
      ...createDocument,
      ...extra,
      uuid,
      name: validName,
      parseStartTime: new Date(),
      extraData: {
        ...(createDocument.extraData || {}),
        mimetype: fileType,
      },
    });
    const id = identifiers[0].id;
    // 是否自动解析文档
    if (!handleParams?.noParse) {
      await this.parseServer({ uuid, ...createDocument }, id);
    }
    const result = await this.documentRepository.findOneBy({ id: id });
    if (fileType?.includes('image')) {
      try {
        this.transformCover([result.id], uuid, file);
      } catch (error) {
        Logger.log(error, `设置文档[${result.id}]封面失败`);
      }
    }
    return result;
  }

  // 知识库中唯一的文件名
  async getValidFilename(
    name: string,
    data: { libraryId: number; type: DocumentType; updateBy: number }
  ) {
    // 文件名截取前80个字符+后缀
    const suffix = name.match(/\.[a-zA-Z]+$/)?.[0] || '';
    const filename = name.replace(new RegExp(suffix + '$'), '');
    const limitNum = 80;
    const limitName = filename.slice(0, limitNum);
    // 获取重名的list
    const pattern = nameRegExp(limitName, { suffix: true, ellipsis: true });
    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .where({ libraryId: data.libraryId, type: data.type });
    if (data.type === DocumentType.user) {
      queryBuilder.andWhere({ updateBy: data.updateBy });
    }
    const sameList = await queryBuilder
      .andWhere('document.name REGEXP :pattern', { pattern })
      .orderBy({ update_time: 'DESC' })
      .getMany();
    const validName = getValidName(sameList, {
      field: 'name',
      originName: limitName,
      pattern,
      ellipsis: filename.length > limitNum,
    });
    return validName + suffix;
  }

  async createFiance(
    createDocument: IFianDocument,
    file: Buffer,
    fileType: string,
    handleParams: DocHandleParams
  ) {
    const library = await this.dataSource
      .createQueryBuilder(Library, 'library')
      .where({ id: createDocument.libraryId, type: Not(LibraryType.custom) })
      .getOne();
    if (!createDocument.libraryId || !library) {
      throw new BadRequestException('libraryId invalid');
    }
    const documentData = {
      ..._.omit(createDocument, docExtraFields),
      extraData: pickWithoutEmpty(createDocument, docExtraFields),
    } as IFianDocument;
    return await this.saveHandle(documentData, file, {
      unique: true,
      type: DocumentType.library,
      fileType,
      handleParams,
    });
  }

  async createDocument(
    data: ICreateDocument,
    file: Buffer,
    fileType: string,
    handleParams: DocHandleParams
  ) {
    const { folderId, userId, filename: name } = data;
    const { id: libraryId } = await this.folderService.getCustomLibrary(userId);

    const folder = await this.folderService.detail(folderId, userId);
    if (folder.libraryId !== libraryId) {
      throw new NotFoundException(`libraryId不存在folderId为 ${folderId} 的文件夹`);
    }
    const queryRunner = this.dataSource.createQueryRunner();
    const documentCount = await queryRunner.manager.countBy(Document, {
      folderId: folderId,
      deleteTime: IsNull(),
    });
    const maxFolderDocCount = Number(process.env.MAX_FOLDER_DOC_COUNT) || 50;
    if (documentCount >= maxFolderDocCount) {
      throw new BadRequestException('文件夹文档数量已满');
    }
    const extraHandle = async () => {
      const sort = await this.folderService.getLatestOne({ libraryId, userId, folderId });
      return { sort };
    };
    return this.saveHandle(
      {
        folderId,
        libraryId,
        name,
        updateBy: userId,
        type: data.type,
        extraData: pickWithoutEmpty(data, docExtraFields),
      },
      file,
      {
        unique: true,
        type: DocumentType.user,
        userId: data.userId,
        extraHandle,
        fileType,
        handleParams,
      }
    );
  }

  /**
   * 分词后处理
   * @param keyword
   * @returns
   */
  postHandlerByCutWord(keyword: string) {
    // 过滤空的、长度小于1的
    const keywordList = cutWord(keyword)
      .filter((l) => l && l.trim())
      .filter((k) => k.length > 1);

    // 不是通用公司关键词
    return keywordList.filter((k) => !filterWords.includes(k));
  }

  async listLibraryDoc(
    filter: FinanceDocumentQueryDto,
    { skip, take }: IPage,
    sort: DocSortDto,
    user: IUser
  ) {
    const {
      industry,
      financeDate,
      financeType,
      company,
      updateBy,
      updateTime,
      name,
      keywords,
      status,
      visibility,
    } = filter;
    const queryWhere: ObjectLiteral = {
      libraryId: filter.libraryId,
      type: DocumentType.library,
      visibility: DocumentVisibilityEnums.VISIBLE,
    };
    if (updateTime) {
      if (updateTime[0] && updateTime[1]) {
        queryWhere.updateTime = Between(updateTime[0], updateTime[1]);
      } else if (updateTime[0]) {
        queryWhere.updateTime = MoreThanOrEqual(updateTime[0]);
      } else if (updateTime[1]) {
        queryWhere.updateTime = LessThanOrEqual(updateTime[1]);
      }
    }
    if (name) {
      queryWhere.name = Like(`%${name}%`);
    }
    if (updateBy?.length) {
      queryWhere.updateBy = In(updateBy);
    }
    if (status?.length) {
      queryWhere.status = status?.length === 1 ? status[0] : In(status);
    }
    if (visibility != null) {
      if (Array.isArray(visibility)) {
        queryWhere.visibility = In(visibility);
      } else {
        queryWhere.visibility = visibility;
      }
    }
    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .select('document.*')
      // .addSelect('user.account', 'updateByName')
      .where(queryWhere);

    const getResults = async (queryBuilder: SelectQueryBuilder<Document>) => {
      if (financeDate) {
        // const financeDateQueryKey = `STR_TO_DATE(JSON_EXTRACT(document.extra_data, "$.financeDate"), '"%Y-%m-%dT%H:%i:%s.%fZ"')`;
        /**
         * STR_TO_DATE   将字符串转换为日期格式
         * JSON_UNQUOTE 去除字符串两边的引号
         * JSON_EXTRACT 提取json字符串中的字段值
         */
        // const financeDateQueryKey = `JSON_UNQUOTE(JSON_EXTRACT(document.extra_data, "$.financeDate"))`;
        const financeDateQueryKey = `document.data_finance_date`;
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
      if (company) {
        // const companyQueryKey = `JSON_EXTRACT(document.extra_data, "$.company")`;
        const companyQueryKey = `document.data_company`;
        queryBuilder.andWhere(`${companyQueryKey} LIKE :company`, {
          company: `%${company}%`,
        });
      }
      if (financeType) {
        // const financeTypeQueryKey = `JSON_EXTRACT(document.extra_data, "$.financeType")`;
        const financeTypeQueryKey = `document.data_finance_type`;
        queryBuilder.andWhere(`${financeTypeQueryKey} IN (:type)`, {
          type: financeType,
        });
      }
      if (industry?.length) {
        // const industryQueryKey = `JSON_EXTRACT(document.extra_data, "$.industry")`;
        const industryQueryKey = `document.data_industry`;
        queryBuilder.andWhere(`JSON_OVERLAPS(${industryQueryKey}, (:industry))`, {
          industry: `[${industry.map((ind) => `"${ind}"`)}]`,
        });
      }

      const sortObj: DocSortDto =
        sort && Object.keys(sort).length
          ? _.omit(sort, ['financeDate'])
          : { createTime: SortEnum.DESC };
      queryBuilder.orderBy(filterEmpty(toSnakeCase(sortObj)));
      const financeDateSort = sort?.financeDate;
      if (financeDateSort) {
        // const financeDateSortKey = `JSON_UNQUOTE(JSON_EXTRACT(document.extra_data, "$.financeDate"))`
        const financeDateSortKey = `document.data_finance_date`;
        queryBuilder.addOrderBy(financeDateSortKey, financeDateSort);
      }
      // .leftJoin(User, 'user', 'user.id = document.update_by')
      queryBuilder.offset(skip).limit(take);
      return await Promise.all([queryBuilder.execute(), queryBuilder.getCount()]);
    };

    let list = [];
    let total = 0;
    const cache_key =
      'listLibraryDoc_' +
      md5(
        JSON.stringify({
          filter,
          skip,
          take,
          sort,
        })
      );

    const startTime = new Date();

    const value: [any[], number] = await this.cacheManager.get(cache_key);
    if (value) {
      [list, total] = value;
      Logger.log(`命中缓存：${new Date().getTime() - startTime.getTime()}ms`, 'FindDocumentList');
    } else {
      if (keywords) {
        const analysisData = await analystKeyword(keywords);
        Logger.log(`data: ${JSON.stringify(analysisData)}`, 'AnalystKeyword');

        // 关键词长度只有一位，直接like搜索 —— 修复case：搜索”申“，问题解析返回多个不相关的公司，导致搜索结果为空
        if (keywords.length === 1) {
          queryBuilder.andWhere(`document.name LIKE (:keyword)`, {
            keyword: `%${keywords}%`,
          });
        }
        // 抽取公司、年份、报告类型都为空，保留keyword查询 —— 修复case：搜索”信息“、”证券“，问题解析返回为空，导致搜索结果为所有文件
        else if (
          analysisData.keywords?.length &&
          !analysisData?.companies?.length &&
          !analysisData?.years?.length &&
          !analysisData?.finance_types?.length
        ) {
          const queryKeywordsSql = analysisData.keywords.map((y) => `document.name LIKE '%${y}%'`);
          queryBuilder.andWhere(`(${queryKeywordsSql.join(' OR ')})`);
        }
        // 问题解析、搜索
        else {
          // 公司
          if (analysisData?.companies?.length) {
            queryBuilder.andWhere(`document.data_company IN (:company)`, {
              company: analysisData.companies,
            });
          }
          // 年份
          if (analysisData?.years?.length) {
            const queryYearSql = analysisData.years.map((y) => `document.name LIKE '%${y}%'`);
            queryBuilder.andWhere(`(${queryYearSql.join(' OR ')})`);
          }
          // 报告类型
          if (analysisData?.finance_types?.length) {
            const financeTypeQueryKey = `document.data_finance_type`;
            queryBuilder.andWhere(`${financeTypeQueryKey} IN (:type)`, {
              type: analysisData?.finance_types,
            });
          }
        }
      }
      [list, total] = await getResults(queryBuilder);
      // 设置ttl不生效，只能使用Redis-Options中的TTL；直接使用redisStore.set方法去设置ttl
      // await this.cacheManager.set(cache_key, [list, total]);
      const startTime = new Date();
      // @ts-ignore
      this.cacheManager.store.set(cache_key, [list, total], {
        ttl: process.env.CACHE_TTL_LISTLIBRARYDOC
          ? Number(process.env.CACHE_TTL_LISTLIBRARYDOC)
          : 5 * 60,
      });
      Logger.log(
        `SQL查询时间：${new Date().getTime() - startTime.getTime()}ms`,
        'FindDocumentList'
      );
    }

    if (keywords) {
      // 插入搜索记录
      let companies = [];
      for (const fileDetail of list) {
        companies.push(fileDetail.data_company);
      }
      companies = Array.from(new Set(companies));
      this.dataSource
        .createQueryBuilder(Log, 'logs')
        .insert()
        .values({ data: { keywords, companies }, userId: user?.id, type: LogEnum['home-search'] })
        .execute();
    }

    return { list: toCamelCase(list), total };
  }

  async listLibraryDocByIds(
    { ids, folderIds, filename, status, type }: ListByFilterDto,
    user?: IUser
  ) {
    const query: FindOptionsWhere<Document>[] = [];
    if (ids?.length || folderIds?.length) {
      if (ids?.length) {
        query.push({ id: In(ids), type: DocumentType.library });
      }
      if (user) {
        if (ids?.length) {
          query.push({ id: In(ids), type: DocumentType.user, updateBy: user.id });
        }
        if (folderIds?.length) {
          const customLibrary = await this.dataSource
            .createQueryBuilder(Library, 'library')
            .where({ userId: user.id, type: LibraryType.custom })
            .getOne();
          const folders = await this.dataSource
            .createQueryBuilder(Folder, 'folder')
            .where({ libraryId: customLibrary.id })
            .getMany();
          const folderIdList = getSubFolders(folders, folderIds);
          const queryBuilder = this.documentRepository
            .createQueryBuilder()
            .where([
              ...query,
              { folderId: In(folderIdList), updateBy: user.id, type: DocumentType.user },
            ]);
          if (status) {
            queryBuilder.andWhere({ status });
          }
          if (type) {
            queryBuilder.andWhere({ type });
          }
          const docs = await queryBuilder.getMany();
          return formatTree(
            { folders: folders.filter((item) => folderIdList.includes(item.id)), docs },
            { detail: true, returnAll: true }
          ).filter((item) =>
            item.nodeType === RecycleTypeEnum.folder ? folderIds.includes(item.id) : true
          );
        }
      }
    } else {
      if (!filename) return [];
      query.push({ name: Like(`%${filename}%`), type: DocumentType.library });
      if (user) {
        query.push({ name: Like(`%${filename}%`), type: DocumentType.user, updateBy: user.id });
      }
    }
    const queryBuilder = this.documentRepository.createQueryBuilder().where(query);
    if (status) {
      queryBuilder.andWhere({ status });
    }
    if (type) {
      queryBuilder.andWhere({ type });
    }
    return await queryBuilder.getMany();
  }

  async getListByFolder(folderId, userId) {
    return await this.documentRepository.find({
      where: { folderId, type: DocumentType.user, updateBy: userId },
      order: { sort: 'ASC' },
    });
  }

  async delete(ids: number[], user: IUser) {
    const queryRunner = this.dataSource.createQueryRunner();
    const docList = await queryRunner.manager.findBy(Document, {
      id: In(ids),
      deleteTime: IsNull(),
    });
    const error = docList.find(
      (data) =>
        (data.type === DocumentType.library && ![IUserRole.admin].includes(user.role)) ||
        (data.type === DocumentType.user && data.updateBy !== user.id)
    );
    if (error) {
      throw new ForbiddenException('你没有该文档的权限');
    }
    await queryRunner.startTransaction();
    let result;
    try {
      const recycleList = [];
      const libraryUuids = [];
      const personalUuids = [];
      for (const item of docList) {
        if (item.type === DocumentType.library) {
          libraryUuids.push(item.uuid);
        } else {
          personalUuids.push(item.uuid);
        }
        item.updateBy = user.id;
        item.deleteTime = new Date();
        await queryRunner.manager.update(Document, item.id, item);
        recycleList.push({
          source: { type: RecycleTypeEnum.document, id: item.id, name: item.name },
          userId: user.id,
          expiry: dayjs().add(30, 'days').toDate(),
        });
      }
      await queryRunner.manager.insert(Recycle, recycleList);

      await deleteChatDocByUUIDS(libraryUuids, personalUuids, user);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      result = error;
    } finally {
      await queryRunner.release();
    }
    throwError(result);
    return true;
  }

  async detail(
    id: number,
    user: IUser,
    { read = false }: { read?: boolean } = {}
  ): Promise<Document> {
    const result = await this.documentRepository.findOneBy({ id });
    if (!result) {
      throw new NotFoundException('文档不存在');
    }
    if (![IUserRole.admin].includes(user?.role)) {
      if (
        (result.type === DocumentType.library && !read) ||
        (result.type === DocumentType.user && result.updateBy !== user?.id)
      ) {
        throw new ForbiddenException('你没有该文档的权限');
      }
    }
    return result;
  }

  async reparse(id: number, user: IUser) {
    const result = await this.detail(id, user);
    await this.documentRepository.update(result.id, {
      id: result.id,
      status: DocumentStatus.docparser,
      message: null,
      parseTime: null,
      parseStartTime: new Date(),
      updateBy: user.id,
    });
    await this.parseServer(result, id);
    return true;
  }

  async move(folderData: DocumentFolderMoveDto[], user: IUser) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    let result = true;
    try {
      const customLibrary = await queryRunner.manager
        .createQueryBuilder(Library, 'library')
        .where({ userId: user.id, type: LibraryType.custom })
        .getOne();
      const documentCount = await queryRunner.manager
        .createQueryBuilder(Document, 'document')
        .where({
          id: In(folderData.map((item) => item.documentId)),
          updateBy: user.id,
          type: DocumentType.user,
          libraryId: customLibrary.id,
        })
        .getCount();
      const folderIds = [...new Set(folderData.map((item) => item.folderId))];
      const folderList = await queryRunner.manager.findBy(Folder, {
        id: In(folderIds),
        userId: user.id,
        libraryId: customLibrary.id,
      });
      if (documentCount !== folderData.length) {
        throw new BadRequestException('documentId invalid');
      }
      if (folderList.length !== folderIds.length) {
        throw new BadRequestException('folderId invalid');
      }
      for (const item of folderData) {
        const latestDocument = await queryRunner.manager.findOne(Document, {
          where: {
            folderId: item.folderId || IsNull(),
            updateBy: user.id,
            type: DocumentType.user,
            libraryId: customLibrary.id,
          },
          order: { sort: 'DESC' },
        });
        const latestFolder = await queryRunner.manager.findOne(Folder, {
          where: { libraryId: customLibrary.id, userId: user.id },
          order: { sort: 'DESC' },
        });
        await queryRunner.manager.update(Document, item.documentId, {
          id: item.documentId,
          folderId: item.folderId || null,
          updateBy: user.id,
          sort: Math.max(...[latestDocument?.sort, latestFolder?.sort, 0].filter((i) => i)) + 1,
        });
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      result = error;
    } finally {
      await queryRunner.release();
    }
    throwError(result);
    return true;
  }

  async sort(sortData: DocumentSortDto[], user: IUser) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    let result = true;
    try {
      const docList = [];
      const folderList = [];
      for (const item of sortData) {
        if (item.type === SortTypeEnum.folder) {
          folderList.push(item);
        } else {
          docList.push(item);
        }
      }
      const documentCount = await queryRunner.manager
        .createQueryBuilder(Document, 'document')
        .where({
          id: In(docList.map((item) => item.id)),
          updateBy: user.id,
          type: DocumentType.user,
        })
        .getCount();
      if (documentCount !== docList.length) {
        throw new BadRequestException('documentId invalid');
      }

      const folderCount = await queryRunner.manager.countBy(Folder, {
        id: In(folderList.map((item) => item.id)),
        userId: user.id,
      });
      if (folderCount !== folderList.length) {
        throw new BadRequestException('folderId invalid');
      }

      for (const item of docList) {
        await queryRunner.manager.update(Document, item.id, { id: item.id, sort: item.sort });
      }

      for (const item of folderList) {
        await queryRunner.manager.update(Folder, item.id, { id: item.id, sort: item.sort });
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      result = error;
    } finally {
      await queryRunner.release();
    }
    throwError(result);
    return true;
  }

  async update(data: UpdateDocDto, user: IUser) {
    if (user.role === IUserRole.user) {
      const existDocument = await this.documentRepository.findOneBy({
        id: data.id,
        updateBy: user.id,
      });
      if (!existDocument) {
        throw new ForbiddenException();
      }
    }
    const result = await this.detail(data.id, user);
    const updateData = {
      id: data.id,
      ...pickWithoutEmpty(data, ['name', 'status', 'visibility']),
    } as UpdateDocDto;
    const extraData = pickWithoutEmpty(data, docExtraFields);
    if (Object.keys(extraData).length) {
      updateData['extraData'] = { ...result.extraData, ...extraData };
    }
    // 修改名称时,判断名称是否重复
    if ('name' in data && updateData.name && updateData.name !== result.name) {
      updateData.name = await this.getValidFilename(data.name, result);
    }
    await this.documentRepository.update(data.id, updateData);
    if (data.cover && data.cover !== result.extraData?.cover) {
      const path = data.cover;
      await this.transformCover([data.id], path);
    }
    return await this.documentRepository.findOneBy({ id: data.id });
  }

  async download(data: DownloadQueryDto, response: Response, user: IUser) {
    // const startTime = +new Date();
    const docId = parseInt(data.id);
    let result = [DownloadEnum.imageList].includes(data.type)
      ? ({} as never)
      : await this.detail(docId, user, { read: true });
    const url = process.env.DOWNLOAD_ADDRESS;
    let suffix = {
      [DownloadEnum.source]: result.uuid,
      [DownloadEnum.docparser]: 'parser-' + result.uuid + '.gz',
      [DownloadEnum.merge]: 'merge-' + result.uuid + '.gz',
      [DownloadEnum.brief]: 'brief-' + result.uuid + '.gz',
      [DownloadEnum.catalog]: 'catalog-' + result.uuid + '.gz',
      [DownloadEnum.imageList]: data.id,
    };
    if (Number(data.document_type) === DocumentType.user) {
      suffix = {
        [DownloadEnum.source]: result.uuid,
        [DownloadEnum.docparser]: 'User_' + user.id + '/parser-' + result.uuid + '.gz',
        [DownloadEnum.merge]: 'User_' + user.id + '/merge-' + result.uuid + '.gz',
        [DownloadEnum.brief]: 'User_' + user.id + '/brief-' + result.uuid + '.gz',
        [DownloadEnum.catalog]: 'User_' + user.id + '/catalog-' + result.uuid + '.gz',
        [DownloadEnum.imageList]: 'User_' + user.id + '/' + data.id,
      };
    }

    let fileUrl = url + suffix[data.type];
    let axiosResponse: AxiosResponse<Stream>;
    try {
      // 下载Catalog
      if ([DownloadEnum.catalog].includes(data.type)) {
        const tocFileUrl = url + 'fitz-toc-' + result.uuid + '.gz';
        try {
          axiosResponse = await firstValueFrom(
            this.httpService.get(tocFileUrl, { responseType: 'stream' })
          );
        } catch (error) {
          if (error.response.status === 404) {
            axiosResponse = await firstValueFrom(
              this.httpService.get(fileUrl, { responseType: 'stream' })
            );
          }
        }
      }
      // 下载图片
      if ([DownloadEnum.imageList].includes(data.type)) {
        const isDocParserImage = !!data.id && /[a-z0-9]{32}_[0-9]+\.(png|gz|webp)$/.test(data.id);
        // 原docparser
        if (isDocParserImage) {
          axiosResponse = await firstValueFrom(
            this.httpService.get(fileUrl, { responseType: 'stream' })
          );
        }
        // pdf2md
        else if (data.image_id) {
          axiosResponse = await getStreamByTextinImage(data.image_id);
        }
        // pdf2md 单页图片，访问源文件
        else {
          if (!result?.uuid) {
            result = await this.detail(docId, user, { read: true });
          }
          fileUrl = url + result.uuid;
          axiosResponse = await firstValueFrom(
            this.httpService.get(fileUrl, { responseType: 'stream' })
          );
        }
      }
      // 下载其他
      else {
        axiosResponse = await firstValueFrom(
          this.httpService.get(fileUrl, { responseType: 'stream' })
        );
      }
    } catch (error) {
      if (
        [DownloadEnum.catalog, DownloadEnum.docparser].includes(data.type) &&
        error.response.status === 404
      ) {
        fileUrl = fileUrl.replace(/\.gz$/, '.json');
        axiosResponse = await firstValueFrom(
          this.httpService.get(fileUrl, { responseType: 'stream' })
        );
      } else {
        throwError(error);
      }
    }
    if (/\.gz$/.test(fileUrl)) {
      response.setHeader('Content-Encoding', 'gzip');
    }
    if (data.type === DownloadEnum.source) {
      response.setHeader('Content-Type', 'application/octet-stream');
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(result.name)}"`
      );
    } else if (data.type === DownloadEnum.imageList) {
      response.setHeader('Content-Type', axiosResponse.headers['content-type'] || 'text/plain');
    } else {
      response.setHeader('Content-Type', 'application/json;charset=utf-8');
    }
    response.setHeader('cache-control', 'max-age=31536000');
    // Logger.log(
    //   `下载耗时：${(+new Date() - startTime) / 1000}s, 类型: ${data.type}, fileUrl: ${fileUrl}`,
    //   '文档下载'
    // );
    axiosResponse.data.pipe(response);
  }

  // 状态回调
  async callback(data: CallbackDto) {
    Logger.log('开始', '文档状态回调');
    Logger.log(JSON.stringify(data), '文档状态回调');
    if (Object.values(ChatDocDocumentStatus).includes(data.status)) {
      const params = { uuid: data.uuid, userId: undefined };
      const sqb = this.documentRepository.createQueryBuilder('document');
      sqb
        .select('document.*')
        // .addSelect('CASE WHEN document.summary IS NOT NULL THEN 1 ELSE 0 END', 'summaryStatus')
        .where({ uuid: data.uuid })
        .andWhere({ deleteTime: IsNull() });

      if (data.file_meta?.ori_type === '系统知识库') {
        sqb.andWhere({ type: DocumentType.library });
      } else if (data.file_meta?.ori_type === '个人知识库') {
        if (data.file_meta?.knowledge_id?.startsWith('User_')) {
          const userId = data.file_meta?.knowledge_id.replace('User_', '');
          params.userId = Number(userId);
          sqb.andWhere({ type: DocumentType.user, updateBy: Number(userId) });
        }
      }

      let docList = await sqb.execute();
      docList = toCamelCase(docList);
      if (!docList.length) throw new NotFoundException(`[状态回调]文档[${data.uuid}]不存在`);
      const isSuccess = [ChatDocDocumentStatus.success, ChatDocDocumentStatus.summary].includes(
        data.status
      );
      const isParseDone = data.status == ChatDocDocumentStatus.catalog;
      const localStatus = DocumentStatusMap[data.status];
      // Parse Down 回调的时候会传file_meta，这时去裁剪保存第一页为封面
      if (isParseDone) {
        const ids = docList.map((item) => item.id);
        try {
          // 裁剪并保存第一页为封面
          // pdf2md图片逻辑
          if (data.file_meta?.first_image_id) {
            const image_id = data.file_meta?.first_image_id;
            Logger.log('下载第一页图片（image_id）', '文档状态回调');
            const base64 = await downloadTextinImage(image_id);
            const p1 = this.getPageNumberFromResult(ids, params, data.file_meta?.page_number);
            const p2 = this.transformCover(ids, image_id, Buffer.from(base64, 'base64'));
            await Promise.all([p1, p2]);
          }
          // 单页图片
          else if (isImage(docList[0].name) && data.file_meta?.page_number === 1) {
            Logger.log('单页图片', '文档状态回调');
            await this.getPageNumberFromResult(ids, params);
          }
          // doc parser图片逻辑
          else {
            const path = `${data.uuid}_0.png`;
            Logger.log('下载第一页图片（uuid_page）', '文档状态回调');
            const p1 = this.getPageNumberFromResult(ids, params);
            const p2 = this.transformCover(ids, path);
            await Promise.all([p1, p2]);
          }
          // const hasSummary = docList.every((doc) => doc.summaryStatus === '1');
          // if (!hasSummary) {
          // await this.triggerSummaryGeneration(data.uuid);
          // }
        } catch (error) {
          Logger.error(error, `文档状态回调`);
        }
      }
      Logger.log('设置状态', '文档状态回调');
      for (const doc of docList) {
        const promises = [];
        if (doc.status !== DocumentStatus.success) {
          if (isSuccess && doc.parseStartTime) {
            const parseTime = new Date().getTime() - new Date(doc.parseStartTime).getTime();
            if (parseTime <= 1000 * 60 * 30) {
              doc.parseTime = parseTime;
            }
          }
          promises.push(
            this.documentRepository.update(doc.id, {
              id: doc.id,
              parseTime: doc.parseTime,
              status: localStatus,
            })
          );
        } else {
          Logger.log(`该文档[${doc.id}]状态已经是[成功]，跳过状态修改`, '文档状态回调');
        }
        await Promise.all(promises);
      }
    }
    Logger.log('完成', '文档状态回调');
    return true;
  }

  // 保存封面
  async transformCover(ids: number[], path: string, img?: Buffer) {
    const url = process.env.DOWNLOAD_ADDRESS;
    let imageBlob = img;
    if (!img) {
      try {
        // 是否是docparse解析的base64图片
        const isBase64 = /^[a-z0-9]{32}_[0-9]+\.(png|gz)$/.test(path);
        const { data: base64 } = await fetch.get(url + path, {
          responseType: isBase64 ? 'text' : 'arraybuffer',
        });
        if (isBase64) {
          imageBlob = Buffer.from(base64, 'base64');
        } else {
          imageBlob = base64;
        }
      } catch (error) {
        Logger.log(`文档[${ids}]没有base64图片`, '设置文档封面');
        return;
      }
    }
    Logger.log('文档封面压缩开始', '文档状态回调');
    const cover = await resizeImage(imageBlob, { width: 364, height: 496 });
    Logger.log('文档封面压缩结束', '文档状态回调');
    const coverPath = path.split('_')[0];
    await uploadToStorage(coverPath, cover, `${storagePath.cover}/`);
    await this.documentRepository
      .createQueryBuilder()
      .update()
      .set({ extraData: () => `JSON_SET(extraData, '$.cover', :cover)` })
      .where({ id: In(ids) })
      .setParameters({ cover: coverPath })
      .execute();
    Logger.log(`文档[${ids}]封面设置成功`, '设置文档封面');
  }

  // 从docparser结果获取文档页数
  async getPageNumberFromResult(
    ids: number[],
    { uuid, userId }: { uuid: string; userId?: number },
    pageNumber?: number
  ) {
    if (!pageNumber) {
      const url = process.env.DOWNLOAD_ADDRESS;
      let path = 'parser-' + uuid + '.gz';
      if (userId) {
        // 个人知识库
        path = 'User_' + userId + '/parser-' + uuid + '.gz';
      }
      const { data } = await fetch.get(url + path, {
        responseType: 'arraybuffer',
      });
      const parseData = zlib.gunzipSync(data);
      const parseResult = JSON.parse(parseData.toString('utf8'));
      const page = parseResult.result.src_page_count;
      pageNumber = page;
    }
    if (pageNumber) {
      await this.documentRepository
        .createQueryBuilder()
        .update()
        .set({ extraData: () => `JSON_SET(extraData, '$.pageNumber', :page)` })
        .where({ id: In(ids) })
        .setParameters({ page: pageNumber })
        .execute();
      Logger.log(`文档[${ids}]页数设置成功`, '设置文档页数');
    }
  }

  // 解析超时状态改为失败
  @Cron(CronExpression.EVERY_5_MINUTES)
  async setParseTimeout() {
    const parseList = await this.documentRepository.findBy({
      status: In([DocumentStatus.uploaded, DocumentStatus.docparser, DocumentStatus.catalog]),
      updateTime: LessThan(dayjs().subtract(5, 'minutes').toDate()),
    });
    for (const item of parseList) {
      Logger.log(item.id, '文档解析超时');
      await this.documentRepository.update(item.id, {
        id: item.id,
        status: DocumentStatus.error,
        message: 'parse timeout',
      });
    }
  }

  // 文档概要设置/查询
  async summary(data: DocSummaryDto, ip: string, user: IUser) {
    if (data.data && data.uuid) {
      // 设置概要
      if (!isInternalIp(ip)) {
        throw new ForbiddenException();
      }
      await this.documentRepository
        .createQueryBuilder()
        .update()
        .set({ summary: data.data })
        .where({ uuid: data.uuid })
        .execute();
      Logger.log(`文档[${data.uuid}]概要设置成功`, '文档概要');
      return true;
    } else if (data.regeneration) {
      // 重新生成
      const detail = await this.detail(data.id, user);
      await this.triggerSummaryGeneration(detail.uuid);
    } else if (data.id) {
      // 查询
      await this.detail(data.id, user, { read: true });
      const result = await this.documentRepository
        .createQueryBuilder('doc')
        .select('doc.*')
        .addSelect('doc.summary', 'summary')
        .where({ id: data.id })
        .execute();
      return result[0].summary;
    }
  }

  // 触发概要生成
  async triggerSummaryGeneration(uuid: string) {
    const selfPrefix = process.env.BACKEND_NODE_URL;
    await backendRequest.post('/api/v1/document/summary', {
      uuid,
      callback_url: selfPrefix + '/api/v1/document/summary',
    });
    Logger.log(`文档[${uuid}]概要生成触发`, '文档概要');
  }

  async filterConfigList() {
    const data = await this.dataSource
      .createQueryBuilder(Config, 'config')
      .where({ key: In(['financeType', 'industry', 'concept', 'hotIndustry']) })
      .getMany();
    return data.reduce((pre, item) => ({ ...pre, [item.key]: item.data }), {});
  }

  /**
   * 超管删除用户的文件
   * @param ids
   * @param userId
   */
  async deleteByAdmin(userId: number) {
    const user = await this.dataSource
      .createQueryBuilder(User, 'user')
      .where({ id: userId })
      .getOne();
    if (!user) {
      Logger.warn(new Error(`用户[${userId}]不存在`));
      return;
    }
    const library = await this.libraryRepository.findOneBy({ userId, type: LibraryType.custom });
    if (!library) {
      Logger.warn(new Error(`用户[${userId}]知识库不存在`));
      return;
    }
    const documents = await this.documentRepository.findBy({
      updateBy: userId,
      libraryId: library.id,
      type: DocumentType.user,
    });
    if (documents?.length) {
      await this.delete(
        documents.map((item) => item.id),
        user as unknown as IUser
      );
      Logger.log(`用户[${userId}]删除了${documents.length}个文档`, '文档删除');
    }
  }

  async listByUser(data: ListByUserDto, page: PageDto) {
    const { userId, updateTime, name, status } = data;
    const queryWhere: any = {
      updateBy: userId || Not(IsNull()),
      type: DocumentType.user,
    };

    if (updateTime) {
      if (updateTime[0] && updateTime[1]) {
        queryWhere.updateTime = Between(updateTime[0], updateTime[1]);
      } else if (updateTime[0]) {
        queryWhere.updateTime = MoreThanOrEqual(updateTime[0]);
      } else if (updateTime[1]) {
        queryWhere.updateTime = LessThanOrEqual(updateTime[1]);
      }
    }
    if (name) {
      queryWhere.name = Like(`%${name}%`);
    }
    if (status?.length) {
      queryWhere.status = status?.length === 1 ? status[0] : In(status);
    }

    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .select('document.*')
      .addSelect('user.account', 'updateByName')
      .leftJoin(User, 'user', 'user.id = document.update_by')
      .andWhere(queryWhere)
      .addOrderBy('document.id', 'DESC')
      .offset(page.skip)
      .limit(page.take);
    const [list, total] = await Promise.all([queryBuilder.execute(), queryBuilder.getCount()]);
    return { list, total };
  }
}

/**
 *
 * @param libraryUuids  公开知识库文档的uuids
 * @param personalUuids 个人知识库文档的uuids
 * @param user          文档所属用户
 */
export const deleteChatDocByUUIDS = async (
  libraryUuids: string[],
  personalUuids: string[],
  user: IUser
) => {
  if (personalUuids.length > 0) {
    const personalDeleteUrl = '/api/v1/personal/delete';
    const deleteParams = {
      user_id: String(user.id),
      uuids: personalUuids,
    };
    await backendRequest.post(personalDeleteUrl, deleteParams);
  }

  if (libraryUuids.length > 0) {
    const libraryDeleteUrl = '/api/v1/analyst/delete';
    const deleteParams = {
      uuids: libraryUuids,
    };
    await backendRequest.post(libraryDeleteUrl, deleteParams);
  }
};
