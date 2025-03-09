import { Entity, Column, CreateDateColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class Token {
  @PrimaryColumn({ comment: '登录token' })
  token: string;

  @Column({ name: 'user_id', comment: '用户id' })
  userId: number;

  @Column({ type: 'datetime', comment: '有效期' })
  expiry: Date;

  @CreateDateColumn({ name: 'create_time', comment: '创建时间' })
  createTime: Date;
}
