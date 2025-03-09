import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpModule } from '@nestjs/axios';
import { Request } from 'express';
import { timeout } from '@/common/constant';
import { isInternalIp } from './common/utils';
import { baseConfig } from './db';
import { TransformInterceptor } from './common/interceptions/transform.interception';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { UserModule } from './user/user.module';
import { LibraryModule } from './library/library.module';
import { DocumentModule } from './document/document.module';
import { FolderModule } from './folder/folder.module';
import { ChatModule } from './chat/chat.module';
import { ManagerModule } from './manager/manager.module';
import { RecycleModule } from './recycle/recycle.module';
import { HotspotsModule } from './hotspots/hotspots.module';
import { CacheRedisOptions } from './utils/redis-options';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...baseConfig,
      autoLoadEntities: true,
      synchronize: false,
      logging: false, // 'all',
      logger: 'advanced-console',
    }),

    CacheModule.registerAsync(CacheRedisOptions),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 1000,
        limit: process.env.API_LIMIT ? Number(process.env.API_LIMIT) : 10,
        getTracker: (req) => {
          return req.user?.id || req.ip;
        },
        skipIf(ctx) {
          const request: Request = ctx.switchToHttp().getRequest();
          if (isInternalIp(request.ip, { strict: false })) return true;
          // console.log('ip', request['ip']);
          return true;
        },
      },
    ]),
    { ...HttpModule.register({ timeout }), global: true },
    UserModule,
    LibraryModule,
    FolderModule,
    DocumentModule,
    ChatModule,
    RecycleModule,
    ManagerModule,
    HotspotsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
