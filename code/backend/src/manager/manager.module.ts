import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManagerService } from './manager.service';
import { ManagerController } from './manager.controller';
import { Config } from './entities/config.entity';
import { Code } from './entities/code.entity';
import { Log } from './entities/log.entity';
import { CacheModule } from '@nestjs/cache-manager';
import { PicCacheRedisOptions } from '@/utils/redis-options';
import { FolderService } from '@/folder/folder.service';
import { DocumentService } from '@/document/document.service';
import { UserService } from '@/user/user.service';
import { Folder } from '@/folder/entities/folder.entity';
import { Document } from '@/document/entities/document.entity';
import { User } from '@/user/entities/user.entity';
import { Library } from '@/library/entities/library.entity';
import { Token } from '@/user/entities/token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Config, Code, Log, Folder, Document, User, Library, Token]),
    CacheModule.registerAsync(PicCacheRedisOptions),
  ],
  controllers: [ManagerController],
  providers: [ManagerService, FolderService, DocumentService, UserService],
  exports: [ManagerService],
})
export class ManagerModule {}
