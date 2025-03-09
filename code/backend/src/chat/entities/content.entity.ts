import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ChatFeedback,
  ComplianceCheckStatus,
  ContentStatus,
  ContentType,
  IContentExtraData,
} from '../interfaces/chat.interface';

@Entity()
@Index(['chatId', 'userId', 'type', 'status'])
export class Content {
  @PrimaryGeneratedColumn('increment', { comment: '自增id' })
  id: number;

  @Column({ name: 'chat_id', comment: '对话记录id' })
  chatId: number;

  @Column({ name: 'user_id', comment: '用户id' })
  userId: number;

  // @Column({
  //   name: 'chat_type',
  //   type: 'tinyint',
  //   comment: '1. 指定文档问答，2. 全局问答',
  //   default: ChatTypeEnums.Document,
  // })
  // chatType: ChatTypeEnums;

  @Column({ type: 'text', comment: '问/答的内容' })
  content: string;

  @Column({ type: 'tinyint', comment: '类型（提问/回答）' })
  type: ContentType;

  @Column({ type: 'text', nullable: true, comment: '回答内容source' })
  source: string;

  @Column({ type: 'tinyint', nullable: true, comment: '用户反馈' })
  feedback: ChatFeedback;

  @Column({ type: 'tinyint', nullable: true, comment: '状态' })
  status: ContentStatus;

  @Column({
    name: 'compliance_check',
    type: 'tinyint',
    nullable: true,
    comment: '合规检查状态：1. 问题通过；2. 问题不通过；3. 答案通过；4. 答案不通过',
  })
  complianceCheck: ComplianceCheckStatus;

  @Column({
    name: 'extra_data',
    type: 'json',
    comment: '问答扩展内容',
    nullable: true,
    select: false,
  })
  extraData: IContentExtraData;

  @Index()
  @CreateDateColumn({ name: 'create_time', comment: '创建时间' })
  createTime: Date;

  @UpdateDateColumn({ name: 'update_time', comment: '更新时间' })
  updateTime: Date;

  @DeleteDateColumn({ name: 'delete_time', nullable: true, select: false, comment: '删除时间' })
  deleteTime: Date;
}
