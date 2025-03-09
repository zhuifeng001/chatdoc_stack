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
  DocumentStatus,
  DocumentType,
  DocumentVisibilityEnums,
  IExtraData,
} from '../interfaces/document.interface';

@Entity()
@Index(['libraryId', 'folderId', 'status'])
export class Document {
  @PrimaryGeneratedColumn('increment', { comment: '自增id' })
  id: number;

  @Index()
  @Column({ comment: '文件MD5值' })
  uuid: string;

  @Column({ comment: '文件名' })
  name: string;

  @Column({ name: 'library_id', comment: '知识库id' })
  libraryId: number;

  @Column({ name: 'folder_id', comment: '文件夹id', nullable: true })
  folderId: number;

  @Column({ name: 'extra_data', type: 'json', comment: '文档扩展内容', nullable: true })
  extraData: IExtraData;

  @Column({ name: 'update_by', comment: '更新人' })
  updateBy: number;

  @Column({ type: 'tinyint', comment: '文档解析状态', default: DocumentStatus.uploaded })
  status: DocumentStatus;

  @Column({ type: 'tinyint', comment: '文档是否可见', default: DocumentVisibilityEnums.VISIBLE })
  visibility: DocumentVisibilityEnums;

  @Column({ type: 'varchar', length: 1000, comment: '文档解析失败message', nullable: true })
  message: string;

  @Column({ type: 'text', comment: '文档概要', nullable: true, select: false })
  summary: string;

  @Index()
  @Column({ comment: '文档在文件夹中的顺序', nullable: true })
  sort: number;

  @Column({ type: 'tinyint', comment: '文档类型', default: DocumentType.user })
  type: DocumentType;

  @Column({ name: 'parse_time', comment: '解析耗时', nullable: true })
  parseTime: number;

  @Column({ type: 'datetime', name: 'parse_start_time', comment: '解析开始时间', nullable: true })
  parseStartTime: Date;

  @Index()
  @CreateDateColumn({ name: 'create_time', comment: '创建时间' })
  createTime: Date;

  @Index()
  @UpdateDateColumn({ name: 'update_time', comment: '更新时间' })
  updateTime: Date;

  @DeleteDateColumn({ name: 'delete_time', nullable: true, select: false, comment: '删除时间' })
  deleteTime: Date;
}
