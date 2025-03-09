import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ICodeType } from '../interfaces/config';

@Entity()
export class Code {
  @PrimaryGeneratedColumn('increment', { comment: '自增id' })
  id: number;

  @Column({ comment: '验证码' })
  code: string;

  @Column({ type: 'tinyint', comment: '验证码类型' })
  type: ICodeType;

  @Column({ comment: '用户标识' })
  user: string;

  @Column({ type: 'datetime', comment: '有效期' })
  expiry: Date;

  @Column({ nullable: true, comment: '验证码接口的响应' })
  response: string;

  @CreateDateColumn({ name: 'create_time', comment: '创建时间' })
  createTime: Date;

  @UpdateDateColumn({ name: 'update_time', comment: '更新时间' })
  updateTime: Date;

  @DeleteDateColumn({ name: 'delete_time', nullable: true, select: false, comment: '删除时间' })
  deleteTime: Date;
}
