import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryModule } from '@/library/library.module';
import { HotspotsService } from './hotspots.service';
import { HotspotsController } from './hotspots.controller';
import { Hotspots } from './entities/hotspots.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Hotspots]), LibraryModule],
  controllers: [HotspotsController],
  providers: [HotspotsService],
  exports: [HotspotsService],
})
export class HotspotsModule {}
