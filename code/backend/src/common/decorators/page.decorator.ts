import { applyDecorators, createParamDecorator, ExecutionContext, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiHideProperty,
  ApiOkResponse,
  ApiProperty,
  getSchemaPath,
} from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { Request } from 'express';
import { ResponseDto } from './response.decorator';

export interface IPage {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export const Page = createParamDecorator(
  (data: 'query' | 'body' = 'query', ctx: ExecutionContext) => {
    const request: Request = ctx.switchToHttp().getRequest();
    const query = data === 'body' ? request.body : request.query;
    const defaultPage = 1;
    const defaultLimit = 10;
    const page = Number(query.page) || defaultPage;
    const pageSize = Number(query.pageSize) || defaultLimit;
    return {
      page,
      pageSize,
      skip: (page - 1) * pageSize,
      take: pageSize,
    };
  }
);

export class PageDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  page: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  pageSize: number;

  @ApiHideProperty()
  @IsInt()
  skip: number;

  @ApiHideProperty()
  @IsInt()
  take: number;
}

export class PaginatedDto<TData> {
  @ApiProperty({ description: 'total' })
  total: number;

  list: TData[];
}

export const ApiPaginatedResponse = <TModel extends Type<unknown>>(model: TModel) => {
  return applyDecorators(
    ApiExtraModels(PaginatedDto, model),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(ResponseDto) },
          {
            properties: {
              data: {
                allOf: [
                  { $ref: getSchemaPath(PaginatedDto) },
                  {
                    properties: {
                      list: {
                        type: 'array',
                        items: { $ref: getSchemaPath(model) },
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    })
  );
};
