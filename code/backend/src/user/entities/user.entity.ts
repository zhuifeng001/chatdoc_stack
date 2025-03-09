import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { IUserRole, IUserStatus } from '../interfaces/user.interface';

@Entity()
export class User {
  @PrimaryGeneratedColumn('increment', { comment: '自增id' })
  id: number;

  @Column({ unique: true, comment: '帐号' })
  account: string;

  @Column({ select: false, nullable: true, comment: '加密后的密码' })
  password: string;

  @Column({ name: 'login_failed_count', type: 'int', nullable: true, comment: '登录失败次数' })
  loginFailedCount: number;

  @Column({ nullable: true, comment: '用户名称' })
  name: string;

  @Column({ nullable: true, unique: true, comment: '邮箱' })
  email: string;

  @Column({ nullable: true, unique: true, comment: '手机号' })
  mobile: string;

  @Column({ nullable: true, unique: true, comment: 'textin openid' })
  openid: string;

  @Column({ name: 'mobile_area_code', nullable: true, comment: '手机号国际区号' })
  mobileAreaCode: string;

  @Column({ nullable: true, comment: '头像' })
  avatar: string;

  @Column({ nullable: true, comment: '公司' })
  company: string;

  @Column({ type: 'tinyint', comment: '用户角色' })
  role: IUserRole;

  @Column({ select: false, comment: '加密盐' })
  salt: string;

  @Column({ type: 'tinyint', comment: '用户状态', default: IUserStatus.normal })
  status: IUserStatus;

  @Index()
  @CreateDateColumn({ name: 'create_time', comment: '创建时间' })
  createTime: Date;

  @UpdateDateColumn({ name: 'update_time', comment: '更新时间' })
  updateTime: Date;

  @DeleteDateColumn({ name: 'delete_time', nullable: true, select: false, comment: '删除时间' })
  deleteTime: Date;
}
