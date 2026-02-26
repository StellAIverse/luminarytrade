import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  COMPOSABLE_METADATA_KEY,
  VALIDATE_SCHEMA_KEY,
  TRANSFORM_MAPPER_KEY,
  COMPRESS_METADATA_KEY,
} from '../constants';
import { MetadataRegistryService } from '../metadata-registry.service';
import { OutputMapper } from '../decorators/transform.decorator';
import { ValidationSchema } from '../decorators/validate.decorator';

/**
 * CompositionInterceptor — global interceptor for the decorator composition system.
 *
 * Handles the following phases in priority order:
 *
 *  VALIDATE  (30) — runs synchronously BEFORE next.handle() is called.
 *                   Reads the schema stored by @Validate and calls schema.validate(req.body).
 *                   Throws BadRequestException on failure, stopping the chain.
 *
 *  COMPRESS  (70) — sets an X-Composition-Compress: true response header.
 *                   Actual compression is handled by platform-level middleware.
 *
 *  TRANSFORM (60) — applied as pipe(map(mapper)) on the RxJS Observable returned
 *                   by next.handle(), transforming the handler's response.
 *
 * AUTH  (10) and RATE_LIMIT (20) run in the guard phase (before this interceptor)
 * via guards registered by @Auth and @ComposedRateLimit respectively.
 *
 * CACHE (40) and LOG (50) wrap the method descriptor directly and therefore run
 * inside the handler invocation, not inside this interceptor.
 *
 * Registered as APP_INTERCEPTOR in DecoratorCompositionModule.
 */
@Injectable()
export class CompositionInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly registry: MetadataRegistryService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isComposable = this.reflector.getAllAndOverride(
      COMPOSABLE_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Fast path: route has not opted in
    if (!isComposable) return next.handle();

    const handler = context.getHandler();
    const controller = context.getClass();

    const composed = this.registry.getComposedMetadata(
      controller.name,
      handler.name,
    );

    // ── Phase: VALIDATE (priority 30) ────────────────────────────────────────
    // Run before next.handle() so the handler never executes on invalid input.
    if (composed.hasValidation) {
      const schema = this.reflector.get<ValidationSchema>(
        VALIDATE_SCHEMA_KEY,
        handler,
      );
      if (schema) {
        const req = context.switchToHttp().getRequest();
        const { valid, errors } = schema.validate(req.body);
        if (!valid) {
          throw new BadRequestException({
            message: 'Validation failed',
            errors: errors ?? [],
          });
        }
      }
    }

    // ── Phase: COMPRESS (priority 70) — set response header hint ─────────────
    if (composed.hasCompress) {
      const shouldCompress = this.reflector.get<boolean>(
        COMPRESS_METADATA_KEY,
        handler,
      );
      if (shouldCompress) {
        const res = context.switchToHttp().getResponse();
        res.setHeader('X-Composition-Compress', 'true');
      }
    }

    // ── Phase: Execute handler + TRANSFORM (priority 60) ─────────────────────
    let pipeline = next.handle();

    if (composed.hasTransform) {
      const mapper = this.reflector.get<OutputMapper>(
        TRANSFORM_MAPPER_KEY,
        handler,
      );
      if (mapper) {
        pipeline = pipeline.pipe(map(mapper));
      }
    }

    return pipeline;
  }
}
