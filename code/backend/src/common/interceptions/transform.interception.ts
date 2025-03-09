import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<{ code: number; data: unknown; msg: string }> {
    return next.handle().pipe(
      map((data) => ({
        code: 200,
        data,
        msg: 'success',
      }))
    );
  }
}
