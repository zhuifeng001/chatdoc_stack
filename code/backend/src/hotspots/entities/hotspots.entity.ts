import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IHotspots } from '../interfaces/hotspots.interface';

@Entity()
export class Hotspots {
  @PrimaryGeneratedColumn('increment', { comment: '自增id' })
  id: number;

  @Column({ name: 'spots', type: 'json', comment: '热点内容', nullable: true })
  spots: IHotspots;

  @Index()
  @CreateDateColumn({ name: 'create_time', comment: '创建时间' })
  createTime: Date;

  @Index()
  @UpdateDateColumn({ name: 'update_time', comment: '更新时间' })
  updateTime: Date;

  @DeleteDateColumn({ name: 'delete_time', nullable: true, select: false, comment: '删除时间' })
  deleteTime: Date;
}
