import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, FindOptionsWhere, In } from 'typeorm';
import * as dayjs from 'dayjs';
import { Response } from 'express';
import { IUser } from '@/common/decorators';
import { throwError } from '@/common/utils';
import { backendRequest } from '@/common/request';
import { CreateGlobalChatDto } from './dto/chat.dto';
import { Chat } from './entities/chat.entity';
import { Content } from './entities/content.entity';

import {
  ChatType,
  ComplianceCheckStatus,
  ContentStatus,
  ContentType,
  GlobalQaType,
  RetrievalSource,
} from './interfaces/chat.interface';

import { DocumentType } from '@/document/interfaces/document.interface';
import { AxiosResponse } from 'axios';
import { Readable, Stream } from 'stream';
import { User } from '@/user/entities/user.entity';
import { Document } from '@/document/entities/document.entity';

import { IUserStatus } from '@/user/interfaces/user.interface';
import * as iconv from 'iconv-lite';

@Injectable()
export class GlobalChatService {
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,

    @InjectRepository(Document)
    private documentRepository: Repository<Document>,

    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    private dataSource: DataSource
  ) {}

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

  async create(
    createGlobalChatDto: CreateGlobalChatDto,
    user: IUser,
    request: Request,
    response: Response
  ) {
    if (user.status == null) {
      user = await this.dataSource.createEntityManager().findOne(User, { where: { id: user.id } });
    }
    if (user.status === IUserStatus.disabled_infer) {
      throw new BadRequestException(
        '您已被暂停提问，发现最近您的提问多次出现不合规内容，如有问题请联系管理员'
      );
    }

    const { extraParams, chatId: id, question, stream, qaType } = createGlobalChatDto;
    let chatId = id;
    const queryRunner = this.dataSource.createQueryRunner();
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
        let chatType = ChatType.global;
        if (createGlobalChatDto.qaType === GlobalQaType.analyst) {
          chatType = ChatType.analyst
        }
        else if (createGlobalChatDto.qaType === GlobalQaType.personal) {
          chatType = ChatType.personal
        }
        const { identifiers } = await queryRunner.manager.insert(Chat, {
          userId: user.id,
          name: question.slice(0, 40), // 截取前40
          type: chatType
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
        status: createGlobalChatDto.ignore ? ContentStatus.script : null,
      });
      const questionId = questionInsertRes.identifiers[0].id;

      let qa_type = qaType
      if (!qa_type) {
        qa_type = GlobalQaType.global;
      }
      const params = {
        ...extraParams,
        question,
        stream,
        qa_type,
        user_id: String(user.id)
      };
      const startTime = Date.now().valueOf();
      let retrievalTime = 0;
      let firstTokenTime = 0;
      let fullTime = 0;
      Logger.log(params, '全局问答参数');
      let data;
      let questionSource: RetrievalSource[] = [];
      const inferUrl = '/api/v1/global/infer';
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
            const uuids = Array.from<string>(
              questionSource.reduce((uuids: Set<string>, item: RetrievalSource) => {
                if (!uuids.has(item.uuid)) uuids.add(item.uuid);
                return uuids;
              }, new Set())
            );
            // const uuids = [];
            // const { source } = chunkObj.data;
            // for (const retrieveRow of source) {
            //   const { uuid } = retrieveRow;
            //   if (!uuids.includes(uuid)) {
            //     uuids.push(uuid);
            //   }
            // }
            countTime();
            streamRes.push(
              'data: ' + JSON.stringify({ code: 200, data: chunkObj, msg: 'success' }) + '\n\n'
            );

            const results = await this.listLibraryDocByUuids(uuids, user);
            chunkObj.stage = 'retrieve_file_detail';
            chunkObj.data = results;
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
                  if (chunkObj.stage == 'retrieve_result') {
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
      if (data) {
        data.questionSource = questionSource;
      }
      const original = { response: data, request: params };
      fullTime = Date.now().valueOf() - startTime;
      const zhuGeIOHeaders = {
        'User-Agent': request.headers['user-agent'],
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
        status: createGlobalChatDto.ignore ? ContentStatus.script : null,
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

  async listLibraryDocByUuids(uuids, user?: IUser) {
    const startTime = new Date();
    const query: FindOptionsWhere<Document>[] = [];
    if (uuids?.length) {
      query.push({ uuid: In(uuids), type: DocumentType.library });
    }
    if (user) {
      // TODO: 暂时注释个人知识库的搜素，仅支持知识库搜索，合适时机进行放开
      query.push( {uuid: In(uuids), type: DocumentType.user, updateBy: user.id})
    }
    const queryBuilder = this.documentRepository.createQueryBuilder().orWhere(query);
    const result = await queryBuilder.getMany();
    Logger.log(`SQL查询时间：${new Date().getTime() - startTime.getTime()}ms`, 'listLibraryDocByUuids');
    return result
  }
}
