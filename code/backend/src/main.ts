import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import * as cookieParser from 'cookie-parser';
import * as dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseDto } from './common/decorators';
import { timeout } from './common/constant';
import { isInternalIp } from './common/utils';
import { isProd } from './utils/env';

dayjs.locale('zh-cn');

async function bootstrap() {
  console.log('process.env.FRONT_END_URL', process.env.FRONT_END_URL);
  console.log('process.env.BACKEND_NODE_URL', process.env.BACKEND_NODE_URL);
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: { credentials: true, origin: process.env.FRONT_END_URL || '*' },
  });

  app.set('trust proxy', true);
  app.setGlobalPrefix('api');
  app.enableVersioning({ defaultVersion: '1', type: VersioningType.URI });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '100mb', static: false });
  app.useBodyParser('raw', { limit: '1024mb' });

  const swaggerVisible = process.env.SWAGGER;
  if (swaggerVisible !== 'hidden') {
    const options = new DocumentBuilder().setTitle('gpt-qa API文档').setVersion('1.0').build();
    const document = SwaggerModule.createDocument(app, options, {
      extraModels: [ResponseDto],
    });
    SwaggerModule.setup('api', app, document, {
      patchDocumentOnRequest: (req, res, document) => {
        const request = req as Request;
        const response = res as Response;
        // 内部网络才能查看api文档， 生产环境也不能查看api文档
        if (isProd() || !isInternalIp(request.ip, { strict: false })) {
          response.status(403);
          return null;
        }
        if (swaggerVisible === 'auth') {
          const authorization = `Basic ${btoa('swagger:gpt-qa-node')}`;
          if (request.headers.authorization !== authorization) {
            response.setHeader('WWW-Authenticate', 'Basic realm="api auth"');
            response.status(401);
          }
          return document;
        }
        return document;
      },
    });
  }

  const server = await app.listen(3000);
  server.setTimeout(timeout);
}

bootstrap();
