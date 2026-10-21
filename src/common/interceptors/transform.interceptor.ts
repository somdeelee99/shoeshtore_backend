import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

function normalize(value: any): any {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(normalize);
  // Prisma Decimal -> number so both Nuxt and Flutter receive plain numbers
  if (typeof value === 'object' && 's' in value && 'e' in value && 'd' in value && typeof value.toString === 'function') {
    return Number(value.toString());
  }
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalize(v);
    return out;
  }
  return value;
}

/** Wraps every successful response as { success, message, data, meta }. */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((payload) => {
        const body = normalize(payload);
        if (body && typeof body === 'object' && 'data' in body && ('meta' in body || 'message' in body)) {
          return { success: true, ...body };
        }
        return { success: true, message: 'OK', data: body };
      }),
    );
  }
}
