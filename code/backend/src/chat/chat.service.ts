import {
  BadRequestException,
  ForbiddenException,
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
  ObjectLiteral,
  Repository,
} from 'typeorm';
import * as dayjs from 'dayjs';
import { Response } from 'express';
import { IPage, IUser } from '@/common/decorators';
import {
  nameRegExp,
  getValidName,
  throwError,
  toSnakeCase,
  filterEmpty,
  toCamelCase,
} from '@/common/utils';
import { backendRequest } from '@/common/request';
import { Document } from '@/document/entities/document.entity';
import { DocumentStatus, DocumentType } from '@/document/interfaces/document.interface';
import {
  CreateChatDto,
  FeedbackDto,
  HistoryListDetailDto,
  HistoryListDto,
  AnswerIdsDto,
  QAQueryDto,
  QASortDto,
  StatisticsDto,
  UpdateChatDto,
} from './dto/chat.dto';
import { Chat } from './entities/chat.entity';
import { Content } from './entities/content.entity';
import {
  ChatType,
  ChatTypeEnums,
  ComplianceCheckStatus,
  ContentStatus,
  ContentType,
  SplitEnum,
} from './interfaces/chat.interface';
import { MAX_LOOP } from '@/common/constant';
import { Folder } from '@/folder/entities/folder.entity';
import { SortEnum } from '@/document/dto/document.dto';
import { AxiosResponse } from 'axios';
import { Readable, Stream } from 'stream';
import { User } from '@/user/entities/user.entity';
import { IUserStatus } from '@/user/interfaces/user.interface';
import * as iconv from 'iconv-lite';
import { isProd } from '@/utils/env';
@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    private dataSource: DataSource
  ) {}

  async validateDocs(documentIds: number[], user: IUser) {
    const docList = await this.dataSource
      .createQueryBuilder(Document, 'document')
      .where({ id: In(documentIds) })
      .getMany();
    if (docList.length !== documentIds.length) {
      throw new BadRequestException('documentIds contain invalid id');
    }
    const noParseSuccess = docList.find((item) => item.status !== DocumentStatus.success);
    if (noParseSuccess) {
      throw new BadRequestException(`documentId ${noParseSuccess.id} 未解析完成`);
    }
    const errorItem = docList.find((item) => item.folderId && item.updateBy !== user.id);
    if (errorItem) {
      throw new BadRequestException(`documentId ${errorItem.id} 没有操作权限`);
    }
    return docList;
  }

  async validateComplianceCheckStatus(user: IUser) {
    const period = Number(process.env.COMPLIANCE_CHECK_PERIOD) || 7;
    const count = Number(process.env.COMPLIANCE_CHECK_COUNT) || 5;
    const notPassCount = await this.contentRepository
      .createQueryBuilder('content')
      .where({ userId: user.id, type: ContentType.answer })
      .andWhere(`content.compliance_check IN (:...types)`, {
        types: [ComplianceCheckStatus.QUESTION_NO_PASS, ComplianceCheckStatus.ANSWER_NO_PASS],
      })
      // 添加where范围，最近一周
      .andWhere(`content.create_time > :time`, {
        time: dayjs().subtract(period, 'days').format('YYYY-MM-DD HH:mm:ss'),
      })
      .getCount();
    console.log('user.id, notPassCount, period, count', user.id, notPassCount + 1, period, count);
    if (notPassCount + 1 >= count) {
      const userInfo = await this.dataSource
        .createEntityManager()
        .findOne(User, { where: { id: user.id } });
      const message = `用户在${period}天内触发了${count}次`;
      return false;
    }
    return true;
  }

  async create(createChatDto: CreateChatDto, user: IUser, request: Request, response: Response) {
    if (user.status == null) {
      user = await this.dataSource.createEntityManager().findOne(User, { where: { id: user.id } });
    }
    if (user.status === IUserStatus.disabled_infer) {
      throw new BadRequestException(
        '您已被暂停提问，发现最近您的提问多次出现不合规内容，如有问题请联系管理员'
      );
    }

    const {
      extraParams,
      chatId: id,
      documentIds = [],
      folderIds,
      question,
      stream,
    } = createChatDto;
    let chatId = id;
    let docList = [];
    if (documentIds.length) {
      docList = await this.validateDocs(documentIds, user);
    }
    const queryRunner = this.dataSource.createQueryRunner();
    if (folderIds && folderIds.length) {
      const allFolderIds = [...folderIds];
      let loopCount = 0;
      // 递归获取子目录
      const loopSubFolder = async (ids: number[]) => {
        loopCount++;
        if (loopCount > MAX_LOOP) return;
        const subList = await queryRunner.manager.findBy(Folder, { parentId: In(ids) });
        const subIds = subList.map((item) => item.id);
        allFolderIds.push(...subIds);
        await loopSubFolder(subIds);
      };
      await loopSubFolder(folderIds);
      const docs = await this.dataSource
        .createQueryBuilder(Document, 'document')
        .where({ folderId: In(allFolderIds), updateBy: user.id, status: DocumentStatus.success })
        .getMany();
      docList.push(...docs);
    }
    if (chatId) {
      const chat = await this.chatRepository.findOneBy({ id: chatId, userId: user.id });
      if (!chat) {
        throw new BadRequestException('chatId invalid');
      }
    }
    await queryRunner.startTransaction();
    let result;
    let streamRes;
    try {
      // 新对话
      if (!chatId) {
        const historyName = question.slice(0, 40); // 截取前40
        const pattern = nameRegExp(historyName);
        const sameList = await queryRunner.manager
          .createQueryBuilder(Chat, 'chat')
          .where({ userId: user.id })
          .andWhere(
            documentIds.length
              ? '(' +
                  documentIds
                    .map((docId) => `JSON_CONTAINS(chat.context->'$.ids', '${docId}')`)
                    .join(' OR ') +
                  ')'
              : {}
          )
          .andWhere('chat.name REGEXP :pattern', { pattern })
          .orderBy({ update_time: 'DESC' })
          .getMany();
        const { identifiers } = await queryRunner.manager.insert(Chat, {
          context: { ids: documentIds, folders: folderIds },
          userId: user.id,
          name: getValidName(sameList, { field: 'name', originName: historyName, pattern }),
          type: ChatType.document
        });
        chatId = identifiers[0].id;
      }
      const getComplianceCheckStatus = (data) => {
        if (data.answer_compliance != null) {
          return data.answer_compliance
            ? ComplianceCheckStatus.ANSWER_PASS
            : ComplianceCheckStatus.ANSWER_NO_PASS;
        }
        if (data.question_compliance != null) {
          return data.question_compliance
            ? ComplianceCheckStatus.QUESTION_PASS
            : ComplianceCheckStatus.QUESTION_NO_PASS;
        }
        return null;
      };
      const questionInsertRes = await queryRunner.manager.insert(Content, {
        chatId,
        userId: user.id,
        content: question,
        type: ContentType.question,
        status: createChatDto.ignore ? ContentStatus.script : null,
      });
      const questionId = questionInsertRes.identifiers[0].id;

      const uuids = [];
      const companies = [];
      let isFinance = false;
      for (const docItem of docList) {
        const { company } = docItem.extraData || {};
        if (!uuids.includes(docItem.uuid)) {
          uuids.push(docItem.uuid);
          companies.push(company || '');
        }
        if (docItem.type === DocumentType.library) {
          isFinance = true;
        }
      }
      const params = {
        ...extraParams,
        document_uuids: uuids,
        question,
        is_finance: isFinance,
        document_companies: companies,
        stream,
      };
      const startTime = Date.now().valueOf();
      let retrievalTime = 0;
      let firstTokenTime = 0;
      let fullTime = 0;
      Logger.log(params, '问答参数');
      let data;
      let questionSource = [];
      let inferUrl = '/api/v1/analyst/infer';
      if (docList.length > 0 && docList[0].type === DocumentType.user) {
        // 如果存在文件是个人知识库，则使用个人知识库接口去问答
        inferUrl = '/api/v1/personal/infer';
        params['user_id'] = String(user.id);
      }
      if (stream) {
        const axiosResponse: AxiosResponse<Stream> = await backendRequest.post(inferUrl, params, {
          responseType: 'stream',
        });
        streamRes = new Readable({ read() {} });
        const isJSON = axiosResponse.headers['content-type'] === 'application/json';
        let isFirstMsg = true;
        let isSecondMsg = true;
        const countTime = () => {
          if (isFirstMsg) {
            retrievalTime = Date.now().valueOf() - startTime;
            isFirstMsg = false;
          } else if (!isFirstMsg && isSecondMsg) {
            firstTokenTime = Date.now().valueOf() - startTime;
            isSecondMsg = false;
          }
        };
        await new Promise((resolve) => {
          let chunkSelection = '';
          let chunkBytes = iconv.encode('', 'utf-8');

          function handleImmediate(chunkString) {
            if (isJSON && !data) {
              try {
                const res = JSON.parse(chunkString);
                data = res?.data || res;
                const chunk = {
                  code: 200,
                  data: { content: data.answer, status: 'DOING' },
                  msg: 'success',
                };
                streamRes.push('data: ' + JSON.stringify(chunk) + '\n\n');
                countTime();
              } catch (error) {
                Logger.error('chat response parse error');
              }
            }
          }

          const handleRetrieveResultStage = async (chunkObj) => {
            questionSource = chunkObj.data.source;
            countTime();
            streamRes.push(
              'data: ' + JSON.stringify({ code: 200, data: chunkObj, msg: 'success' }) + '\n\n'
            );
          };

          axiosResponse.data.on('data', (chunk) => {
            const mergeChunk = Buffer.concat([chunkBytes, chunk]);
            const currentString = mergeChunk.toString();
            if (!isJSON && !/^data:[\s\S]*\n\n$/.test(currentString)) {
              chunkBytes = mergeChunk;
              return;
            } else if (isJSON) {
              chunkBytes = mergeChunk;
            }
            for (const chunkRow of currentString.trim().split('\n\n')) {
              const chunkItem = chunkRow.trim();
              if (/^data:/.test(chunkItem)) {
                try {
                  const chunkObj = JSON.parse(chunkItem.replace(/^data:/, ''));
                  if (chunkObj.stage === 'retrieve_result') {
                    handleRetrieveResultStage(chunkObj);
                  } else if (chunkObj.status === 'DONE') {
                    data =
                      typeof chunkObj.data === 'string' ? JSON.parse(chunkObj.data) : chunkObj.data;
                    // 最终完整数据，后续处理完再发送
                  } else {
                    streamRes.push(
                      'data: ' +
                        JSON.stringify({ code: 200, data: chunkObj, msg: 'success' }) +
                        '\n\n'
                    );
                    countTime();
                  }
                } catch (error) {
                  continue;
                }
              }
            }
            if (isJSON) {
              chunkSelection = chunkBytes.toString();
            } else {
              chunkSelection = currentString;
              chunkBytes = iconv.encode('', 'utf-8');
            }
          });
          axiosResponse.data.on('end', () => {
            if (chunkSelection) {
              handleImmediate(chunkSelection);
            }
            resolve(true);
          });
          response.setHeader('Content-Type', 'text/event-stream');
          streamRes.pipe(response);
        });
      } else {
        const result = await backendRequest.post(inferUrl, params);
        data = result.data;
      }
      const original = { response: data, request: params };
      fullTime = Date.now().valueOf() - startTime;
      const zhuGeIOHeaders = {
        'User-Agent': request.headers['user-agent'],
        // Host: request.headers['host'],
        // Origin: request.headers['origin'],
        // Referer: request.headers['referer'],
      };
      if (!data) {
        // log
        data = {};
        Logger.error(JSON.stringify(original), 'chat response empty');
      } else {
        // log
      }
      const currentComplianceCheck = getComplianceCheckStatus(data);
      const { identifiers } = await queryRunner.manager.insert(Content, {
        chatId,
        userId: user.id,
        content: data.answer || '',
        complianceCheck: currentComplianceCheck,
        type: ContentType.answer,
        source: JSON.stringify(questionSource?.length ? questionSource : data.source),
        extraData: { original: JSON.stringify(original), questionId },
        status: createChatDto.ignore ? ContentStatus.script : null,
      });
      const answerId = identifiers[0].id;
      await queryRunner.manager.update(Content, questionId, {
        complianceCheck: currentComplianceCheck,
        extraData: {
          answerId,
          answer: data.answer,
          ori_answer: data.ori_answer || data.answer,
          traceId: data.trace_id,
        },
      });
      // 合规审核不通过，超过固定次数，发送通知
      if (
        currentComplianceCheck &&
        [
          ComplianceCheckStatus.QUESTION_NO_PASS, //
          ComplianceCheckStatus.ANSWER_NO_PASS,
        ].includes(currentComplianceCheck)
      ) {
        await this.validateComplianceCheckStatus(user);
      }

      const contentItem = await queryRunner.manager.findOneBy(Content, { id: answerId });
      result = {
        chatId,
        ...contentItem,
        _original: original,
      };
      result = { code: 200, data: result, msg: 'success' };
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      result = error;
      if (streamRes) streamRes.push(null);
    } finally {
      await queryRunner.release();
    }
    throwError(result);
    if (stream) {
      // 发送最终完整数据
      result.data.status = 'DONE';
      streamRes.push('data: ' + JSON.stringify(result) + '\n\n');
      streamRes.push(null);
    } else {
      response.json(result);
    }
  }

  async recommend(ids: number[], user: IUser) {
    const docList = await this.validateDocs(ids, user);
    // 年报问题
    const getQuestionOfYear = ({ extraData: { financeDate } }: Document) => {
      const year = dayjs(financeDate).format('YYYY');
      return [
        `请分析${year}年公司主营业务情况`,
        `公司${year}年份行业发展情况如何？`,
        `${year}年份核心财务数据表现`,
        `${year}年公司的股权结构`,
      ];
    };
    const getQuarterString = (month: string) => {
      switch (month) {
        case '01':
        case '02':
        case '03':
          return '第一季度';
        case '04':
        case '05':
        case '06':
          return '第二季度';
        case '07':
        case '08':
        case '09':
          return '第三季度';
        case '10':
        case '11':
        case '12':
          return '第四季度';
      }
    };
    // 季报问题
    const getQuestionOfQuarter = ({ extraData: { financeDate } }: Document) => {
      const currDate = dayjs(financeDate);
      const year = currDate.format('YYYY');
      const month = currDate.format('MM');
      const quarterString = getQuarterString(month);
      return [
        `${year}年${quarterString}营业收入变化情况`,
        `${year}年${quarterString}主要费用变化情况`,
        `${year}年${quarterString}归母净利润及扣非归母净利润是多少`,
        `${year}年${quarterString}EPS是多少`,
      ];
    };
    // 半年报问题
    const getQuestionOfHalfYear = ({ extraData: { financeDate } }: Document) => {
      const year = dayjs(financeDate).format('YYYY');
      return [
        `${year}年上半年主营业务经营情况`,
        `${year}年上半年主要财务指标如何变化`,
        `${year}年上半年高管人员变动情况`,
        `${year}年上半年股权变动详情`,
      ];
    };
    // 招股书问题
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const getQuestionOfProspectus = (document: Document) => {
      return [
        `发行人截至报告期前三年的主要财务指标`,
        `报告期内发行人主营业务介绍`,
        `报告期内发行人股权结构`,
        `发行人控股股东、实际控制人的基本情况`,
        `本次股票发行概况及募集资金用途`,
      ];
    };
    const item = docList.find((item) => item.extraData?.financeDate && item.extraData?.company);
    if (item) {
      const financeType = item.extraData?.financeType;
      switch (financeType) {
        case 'q1':
        case 'q3':
          return getQuestionOfQuarter(item);
        case 'half_year':
          return getQuestionOfHalfYear(item);
        case 'year':
          return getQuestionOfYear(item);
        case 'zhaogushu':
          return getQuestionOfProspectus(item);
      }
      return [];
    } else {
      return [];
    }
  }

  async history(data: HistoryListDto, userId: number) {
    const queryWhere: ObjectLiteral = { userId };
    let addFilter = [];
    if (data.documentId) {
      addFilter = [
        `(JSON_CONTAINS(chat.context->'$.ids', :ids) AND JSON_LENGTH(chat.context, '$.ids') = :len)`,
        { ids: `[${data.documentId.join()}]`, len: data.documentId.length },
      ];
    } else {
      addFilter = [`chat.context IS NULL`];
    }
    return await this.chatRepository
      .createQueryBuilder('chat')
      .where(queryWhere)
      .andWhere(addFilter[0], addFilter[1])
      .orderBy('update_time', 'DESC')
      .take(data.num || 3)
      .getMany();
  }

  async hasChat(chatId: number, userId: number) {
    const data = await this.chatRepository.findOneBy({ id: chatId });
    if (!data) {
      throw new NotFoundException('对话不存在');
    }
    if (data.userId !== userId) {
      throw new ForbiddenException('你没有该对话的权限');
    }
  }

  async historyDetail(data: HistoryListDetailDto, user: IUser) {
    await this.hasChat(data.chatId, user.id);
    const whereObj: FindOptionsWhere<Content> = { chatId: data.chatId };
    if (data.endContentId) {
      whereObj.id = LessThan(data.endContentId);
    }
    const rows = await this.contentRepository.find({
      where: whereObj,
      order: { createTime: 'DESC' },
      take: data.num || 50,
    });
    const list = rows.reverse();
    const count = await this.contentRepository.countBy({
      chatId: data.chatId,
      id: LessThan(list[0].id),
    });
    return { list, count };
  }

  async contentDetail(data: AnswerIdsDto, user: IUser) {
    const ids =
      data.compatible !== false ? [...(data.answerIds || []), ...(data.questionIds || [])] : null;
    const whereObj: FindOptionsWhere<Content> = { userId: user.id, type: ContentType.answer };
    if (ids) {
      whereObj.id = In(ids);
    } else if (data.answerIds) {
      whereObj.id = In(data.answerIds);
    }
    const queryBuilder = this.contentRepository
      .createQueryBuilder('content')
      .select('content.*')
      .addSelect('content.extraData', 'extraData')
      .addSelect('chat.context', 'context')
      .where(whereObj);
    const idsList = ids || data.questionIds;
    if (idsList) {
      queryBuilder.orWhere(
        '(content.user_id = :userId AND content.type = :type AND JSON_EXTRACT(content.extra_data, "$.questionId") IN (:ids) AND content.id > :startId AND content.id < :startId + 100)',
        {
          userId: user.id,
          type: ContentType.answer,
          ids: idsList,
          startId: Math.min(...idsList),
        }
      );
    }
    queryBuilder.leftJoin(Chat, 'chat', 'chat.id = content.chat_id');
    const list = toCamelCase(await queryBuilder.execute());
    return await this.listFillDoc(list);
  }

  async feedback(data: FeedbackDto, user: IUser) {
    const content = await this.contentRepository.findOneBy({ id: data.contentId });
    if (!content) {
      throw new NotFoundException('contentId invalid');
    }
    await this.hasChat(content.chatId, user.id);
    await this.contentRepository.update(data.contentId, {
      id: data.contentId,
      feedback: data.feedback,
    });
    return true;
  }

  async updateHistory(data: UpdateChatDto, user: IUser) {
    await this.hasChat(data.chatId, user.id);
    await this.chatRepository.update(data.chatId, { id: data.chatId, name: data.name });
    return await this.chatRepository.findOneBy({ id: data.chatId });
  }

  async deleteHistory(ids: number[], user: IUser) {
    const count = await this.chatRepository.countBy({ id: In(ids), userId: user.id });
    if (count !== ids.length) {
      throw new BadRequestException('ids contain invalid id');
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    let result = true;
    try {
      await queryRunner.manager.softDelete(Chat, ids);
      const contentList = await queryRunner.manager.findBy(Content, { chatId: In(ids) });
      await queryRunner.manager.softDelete(Content, contentList);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      result = error;
    } finally {
      await queryRunner.release();
    }
    throwError(result);
    return result;
  }

  async qaList(
    data: QAQueryDto,
    { skip, take }: IPage,
    sort: QASortDto = { createTime: SortEnum.DESC },
    user: IUser
  ) {
    const { question, createTime, documentIds, complianceCheck } = data;
    const queryWhere: ObjectLiteral = {
      userId: user.id,
      type: ContentType.question,
      status: IsNull(),
    };
    if (data.full) {
      if (data.userId) {
        queryWhere.userId = data.userId;
      } else {
        delete queryWhere.userId;
      }
    }
    if (question) {
      queryWhere.content = Like(`%${question}%`);
    }
    if (createTime) {
      if (createTime[0] && createTime[1]) {
        queryWhere.createTime = Between(createTime[0], createTime[1]);
      } else if (createTime[0]) {
        queryWhere.createTime = MoreThanOrEqual(createTime[0]);
      } else if (createTime[1]) {
        queryWhere.createTime = LessThanOrEqual(createTime[1]);
      }
    }
    if (complianceCheck) {
      queryWhere.complianceCheck = In(complianceCheck);
    }
    const queryBuilder = this.contentRepository
      .createQueryBuilder('content')
      .select('content.*')
      .addSelect('chat.context', 'context')
      .addSelect('chat.type', 'chatType')
      .where(queryWhere);
    queryBuilder.leftJoin(Chat, 'chat', 'chat.id = content.chat_id');
    if (queryWhere.userId) {
      queryBuilder.andWhere('chat.user_id = :userId', { userId: queryWhere.userId });
    }
    if (data.chatType) {
      // 问答是否关联文档
      queryBuilder.andWhere(
        `chat.type ${data.chatType === ChatTypeEnums.Document ? '= ' : '!= '} ${ChatType.document}`
      );
    }
    if (data.excludeInternalUser) {
      // 过滤一些用户的问答记录
      let userIds = [];
      // 线上
      if (isProd()) {
        userIds = [1, 2, 12, 45, 46, 48, 64, 95, 28, 70];
      }
      // 其他环境——测试
      else {
        userIds = [1, 18];
      }
      queryBuilder.andWhere('chat.user_id NOT IN (:...userIds)', { userIds: userIds });
    }

    queryBuilder.andWhere(
      documentIds?.length
        ? '(' +
            documentIds
              .map((docId) => `JSON_CONTAINS(chat.context->'$.ids', '${docId}')`)
              .join(' OR ') +
            ')'
        : {}
    );
    if (sort) {
      queryBuilder.orderBy(filterEmpty(toSnakeCase(sort)));
    }
    queryBuilder.offset(skip).limit(take);
    const [list, total] = await Promise.all([queryBuilder.execute(), queryBuilder.getCount()]);
    return { list: await this.listFillDoc(toCamelCase(list)), total };
  }

  async listFillDoc(list) {
    const docIds = list.reduce((pre, cur) => [...pre, ...(cur.context?.ids || [])], []);
    const docList = await this.dataSource
      .createQueryBuilder(Document, 'document')
      .where({ id: In(docIds) })
      .getMany();
    const docMap = docList.reduce((pre, cur) => ({ ...pre, [cur.id]: cur }), {});
    const folderIds = list.reduce((pre, cur) => [...pre, ...(cur.context?.folders || [])], []);
    const folderList = await this.dataSource
      .createQueryBuilder(Folder, 'folder')
      .where({ id: In(folderIds) })
      .getMany();
    const folderMap = folderList.reduce((pre, cur) => ({ ...pre, [cur.id]: cur }), {});
    for (const item of list) {
      item.documents = (item.context?.ids || []).map((id) => docMap[id]);
      item.folders = (item.context?.folders || []).map((id) => folderMap[id]);
    }
    return list;
  }

  async statistics({ createTime, split }: StatisticsDto, user: IUser) {
    let diffDays = dayjs(createTime[1]).diff(createTime[0], 'days') + 1;
    if (diffDays > 31) {
      diffDays = 31;
      createTime[0] = dayjs(createTime[1]).subtract(diffDays, 'days').toDate();
    }
    const totalPromise = this.contentRepository.countBy({
      userId: user.id,
      type: ContentType.question,
    });
    const rangeTotalPromise = this.contentRepository.countBy({
      userId: user.id,
      type: ContentType.question,
      createTime: Between(createTime[0], createTime[1]),
    });
    const oneDay = split === SplitEnum.hour;
    const dayFormat = oneDay ? 'YYYY/MM/DD HH' : 'YYYY/MM/DD';
    const dayListPromise = this.contentRepository
      .createQueryBuilder('cnt')
      .select(
        oneDay ? "DATE_FORMAT(cnt.create_time, '%Y-%m-%d %H:00:00')" : 'DATE(cnt.create_time)',
        'day'
      )
      .addSelect('COUNT(*)', 'count')
      .where({
        userId: user.id,
        type: ContentType.question,
        createTime: Between(createTime[0], createTime[1]),
      })
      .groupBy('day')
      .execute();
    const [total, rangeTotal, dayList] = await Promise.all([
      totalPromise,
      rangeTotalPromise,
      dayListPromise,
    ]);
    const dateMap = dayList.reduce(
      (pre, cur) => ({
        ...pre,
        [dayjs(cur.day).format(dayFormat)]: cur.count,
      }),
      {}
    );
    const list = [];
    if (oneDay) {
      for (let index = 0; index < 24; index++) {
        const day = dayjs(createTime[0]).add(index, 'hours');
        const matchVal = dateMap[day.format(dayFormat)];
        if (matchVal) {
          list.push({ date: day.format('HH:mm'), count: Number(matchVal) });
        } else {
          list.push({ date: day.format('HH:mm'), count: 0 });
        }
      }
    } else {
      for (let index = 0; index < diffDays; index++) {
        const day = dayjs(createTime[0]).add(index, 'days').format(dayFormat);
        if (dateMap[day]) {
          list.push({ date: day, count: Number(dateMap[day]) });
        } else {
          list.push({ date: day, count: 0 });
        }
      }
    }
    return { total, rangeTotal, list };
  }
}
