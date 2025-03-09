import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Folder {
  @PrimaryGeneratedColumn('increment', { comment: '自增id' })
  id: number;

  @Column({ comment: '文件夹名称' })
  name: string;

  @Column({ name: 'user_id', comment: '用户id' })
  userId: number;

  @Column({ name: 'library_id' })
  libraryId: number;

  @Column({ nullable: true, name: 'parent_id', comment: '上级目录' })
  parentId?: number;

  @Index()
  @Column({ comment: '文档在知识库中的顺序', nullable: true })
  sort: number;

  @Index()
  @CreateDateColumn({ name: 'create_time', comment: '创建时间' })
  createTime: Date;

  @Index()
  @UpdateDateColumn({ name: 'update_time', comment: '更新时间' })
  updateTime: Date;

  @DeleteDateColumn({ name: 'delete_time', nullable: true, select: false, comment: '删除时间' })
  deleteTime: Date;
}
