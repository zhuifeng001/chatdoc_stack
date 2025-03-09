import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chat } from './entities/chat.entity';
import { Content } from './entities/content.entity';
import { GlobalChatService } from './global_chat.service';
import { Document } from '@/document/entities/document.entity';


@Module({
  imports: [TypeOrmModule.forFeature([Chat, Content, Document])],
  controllers: [ChatController],
  providers: [ChatService, GlobalChatService],
})
export class ChatModule {}
