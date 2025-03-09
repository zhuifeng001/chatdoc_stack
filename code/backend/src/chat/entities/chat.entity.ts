import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IChatContext } from '../interfaces/chat.interface';

@Entity()
export class Chat {
  @PrimaryGeneratedColumn('increment', { comment: '自增id' })
  id: number;

  @Column({ comment: '对话记录名称' })
  name: string;

  // @Column({
  //   type: 'tinyint',
  //   comment: '1. 指定文档问答，2. 全局问答',
  //   default: ChatTypeEnums.Document,
  // })
  // type: ChatTypeEnums;

  @Column({ type: 'json', nullable: true, comment: '对话关联的文档' })
  context: IChatContext;

  @Index()
  @Column({ name: 'user_id', comment: '用户id' })
  userId: number;

  @Column({ name: 'type', default: 0, comment: '问答类型：0. 文档问答；1. 全局global；2. 全局analyst；3. 全局个人' })
  type: number;

  @Index()
  @CreateDateColumn({ name: 'create_time', comment: '创建时间' })
  createTime: Date;

  @UpdateDateColumn({ name: 'update_time', comment: '更新时间' })
  updateTime: Date;

  @DeleteDateColumn({ name: 'delete_time', nullable: true, select: false, comment: '删除时间' })
  deleteTime: Date;
}
