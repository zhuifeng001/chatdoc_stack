import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath, ApiProperty } from '@nestjs/swagger';
import { HttpStatusCode } from 'axios';

export class ResponseDto<TData> {
  @ApiProperty({ enum: HttpStatusCode, example: 200 })
  code: HttpStatusCode;

  @ApiProperty({ example: 'success' })
  msg: string;

  data: TData;
}

export const ApiResponseWrapper = <TModel extends Type<unknown> | string>({
  type,
  isArray,
}: {
  type: TModel;
  isArray?: boolean;
}) => {
  return applyDecorators(
    ApiExtraModels(type instanceof Function ? type : ResponseDto),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(ResponseDto) },
          {
            properties: {
              data: isArray
                ? {
                    type: 'array',
                    items: typeof type === 'string' ? { type } : { $ref: getSchemaPath(type) },
                  }
                : typeof type === 'string'
                ? { type }
                : { $ref: getSchemaPath(type) },
            },
          },
        ],
      },
    })
  );
};
