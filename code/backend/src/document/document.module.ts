import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { Document } from './entities/document.entity';
import { GlobalChatService } from '@/chat/global_chat.service';
import { Content } from '@/chat/entities/content.entity';
import { Chat } from '@/chat/entities/chat.entity';

import { Library } from '@/library/entities/library.entity';
import { FolderModule } from '@/folder/folder.module';

@Module({
  imports: [TypeOrmModule.forFeature([Document, Library, Chat, Content]), FolderModule],
  controllers: [DocumentController],
  providers: [DocumentService, GlobalChatService],
})
export class DocumentModule {}
