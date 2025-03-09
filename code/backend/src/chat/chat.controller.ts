import { Controller, Get, Post, Body, Query, Res, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import {
  ApiPaginatedResponse,
  ApiResponseWrapper,
  IUser,
  Page,
  PageDto,
  User,
} from '@/common/decorators';
import { ChatService } from './chat.service';
import { GlobalChatService } from './global_chat.service';
import {
  ChatContentResDto,
  ChatResDto,
  CreateGlobalChatDto,
  CreateChatDto,
  IdsChatDto,
  FeedbackDto,
  HistoryListDto,
  HistoryListDetailDto,
  UpdateChatDto,
  RecommendDto,
  QAQueryDto,
  QASortDto,
  ChatContentListResDto,
  StatisticsDto,
  StatisticsResDto,
  ListChatBodyDto,
  AnswerIdsDto,
} from './dto/chat.dto';


@ApiTags('对话')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService, private readonly globalChatService: GlobalChatService) {}

  @ApiOperation({ summary: '提问' })
  @ApiResponseWrapper({ type: ChatContentResDto })
  @Post('/infer')
  async create(
    @Body() createChatDto: CreateChatDto,
    @User() user: IUser,
    @Req() req: Request,
    @Res() res: Response
  ) {
    return await this.chatService.create(createChatDto, user, req, res);
  }

  @ApiOperation({ summary: '全局提问' })
  @ApiResponseWrapper({ type: ChatContentResDto })
  @Post('/global/infer')
  async globalChat(
    @Body() CreateGlobalChatDto: CreateGlobalChatDto,
    @User() user: IUser,
    @Req() req: Request,
    @Res() res: Response
  ) {
    return await this.globalChatService.create(CreateGlobalChatDto, user, req, res);
  }

  @ApiOperation({ summary: '推荐问题' })
  @ApiResponseWrapper({ type: 'string', isArray: true })
  @Post('/recommend')
  async recommend(@Body() data: RecommendDto, @User() user: IUser) {
    return await this.chatService.recommend(data.documentIds, user);
  }

  @ApiOperation({ summary: '历史问题列表' })
  @ApiResponseWrapper({ type: ChatResDto, isArray: true })
  @Get('/history')
  async history(@Query() data: HistoryListDto, @User() user: IUser) {
    return await this.chatService.history(data, user.id);
  }

  @ApiOperation({ summary: '历史问题对话明细' })
  @ApiPaginatedResponse(ChatContentResDto)
  @Get('/history/detail')
  async historyDetail(@Query() data: HistoryListDetailDto, @User() user: IUser) {
    return await this.chatService.historyDetail(data, user);
  }

  @ApiOperation({ summary: '回答明细' })
  @ApiResponseWrapper({ type: ChatContentResDto, isArray: true })
  @Post('/answer/detail')
  async contentDetail(@Body() data: AnswerIdsDto, @User() user: IUser) {
    return await this.chatService.contentDetail(data, user);
  }

  @ApiOperation({ summary: '反馈' })
  @ApiResponseWrapper({ type: ChatContentResDto })
  @Post('/feedback')
  async feedback(@Body() data: FeedbackDto, @User() user: IUser) {
    return await this.chatService.feedback(data, user);
  }

  @ApiOperation({ summary: '更新历史对话标题' })
  @ApiResponseWrapper({ type: ChatResDto })
  @Post('/history/update')
  async updateHistory(@Body() data: UpdateChatDto, @User() user: IUser) {
    return await this.chatService.updateHistory(data, user);
  }

  @ApiOperation({ summary: '删除历史对话' })
  @ApiResponseWrapper({ type: 'boolean' })
  @Post('/history/delete')
  async deleteHistory(@Body() data: IdsChatDto, @User() user: IUser) {
    return await this.chatService.deleteHistory(data.ids, user);
  }

  @ApiOperation({ summary: '个人中心问答记录分页查询' })
  @ApiBody({ type: ListChatBodyDto })
  @ApiPaginatedResponse(ChatContentListResDto)
  @Post('/qa/list')
  async qaList(
    @Body() data: QAQueryDto,
    @Page('body') page: PageDto,
    @Body('sort') sort: QASortDto,
    @User() user: IUser
  ) {
    return await this.chatService.qaList(data, page, sort, user);
  }

  @ApiOperation({ summary: '概览问答次数统计' })
  @ApiResponseWrapper({ type: StatisticsResDto })
  @Post('/statistics')
  async statistics(@Body() data: StatisticsDto, @User() user: IUser) {
    return await this.chatService.statistics(data, user);
  }
}
