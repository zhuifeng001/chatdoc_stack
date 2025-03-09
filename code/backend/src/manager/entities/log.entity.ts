import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LogEnum } from '../interfaces/config';

@Entity()
export class Log {
  @PrimaryGeneratedColumn('increment', { comment: '自增id' })
  id: string;

  @Column({ type: 'json', comment: '日志内容' })
  data: unknown;

  @Column({ type: 'tinyint', comment: '日志类型' })
  type: LogEnum;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @CreateDateColumn({ name: 'create_time', comment: '创建时间' })
  createTime: Date;

  @UpdateDateColumn({ name: 'update_time', comment: '更新时间' })
  updateTime: Date;

  @DeleteDateColumn({ name: 'delete_time', nullable: true, select: false, comment: '删除时间' })
  deleteTime: Date;
}
