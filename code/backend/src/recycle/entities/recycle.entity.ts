import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { IRecycleSource } from '../interfaces/recycle.interface';

@Entity()
export class Recycle {
  @PrimaryGeneratedColumn('increment', { comment: '自增id' })
  id: number;

  @Column({ type: 'json', comment: '原位置' })
  source: IRecycleSource;

  @Column({ type: 'datetime', comment: '有效期' })
  expiry: Date;

  @Column({ name: 'user_id', comment: '用户id' })
  userId: number;

  @Index()
  @CreateDateColumn({ name: 'create_time', comment: '创建时间' })
  createTime: Date;

  @UpdateDateColumn({ name: 'update_time', comment: '更新时间' })
  updateTime: Date;

  @DeleteDateColumn({ name: 'delete_time', nullable: true, select: false, comment: '删除时间' })
  deleteTime: Date;
}
