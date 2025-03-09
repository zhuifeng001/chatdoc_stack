import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LibraryType } from '../interfaces/library.interface';

@Entity()
export class Library {
  @PrimaryGeneratedColumn('increment', { comment: '自增id' })
  id: number;

  @Column({ comment: '知识库名称' })
  name: string;

  @Column({ type: 'varchar', length: 10000, comment: '知识库描述' })
  note: string;

  @Column({ nullable: true, comment: '描述的摘要' })
  summary: string;

  @Column({ type: 'tinyint', comment: '知识库类型' })
  type: LibraryType;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @CreateDateColumn({ name: 'create_time', comment: '创建时间' })
  createTime: Date;

  @UpdateDateColumn({ name: 'update_time', comment: '更新时间' })
  updateTime: Date;

  @DeleteDateColumn({ name: 'delete_time', nullable: true, select: false, comment: '删除时间' })
  deleteTime: Date;
}
