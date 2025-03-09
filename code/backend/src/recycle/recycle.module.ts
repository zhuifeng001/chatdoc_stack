import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecycleService } from './recycle.service';
import { RecycleController } from './recycle.controller';
import { Recycle } from './entities/recycle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Recycle])],
  controllers: [RecycleController],
  providers: [RecycleService],
  exports: [RecycleService],
})
export class RecycleModule {}
