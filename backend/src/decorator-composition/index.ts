// ─── Module ──────────────────────────────────────────────────────────────────
export { DecoratorCompositionModule } from './decorator-composition.module';

// ─── Core Service ────────────────────────────────────────────────────────────
export {
  MetadataRegistryService,
  bufferDecoratorEntry,
} from './metadata-registry.service';

// ─── Constants ───────────────────────────────────────────────────────────────
export {
  COMPOSABLE_METADATA_KEY,
  COMPOSITION_STACK_KEY,
  COMPOSITION_ORDER_KEY,
  PARAM_METADATA_KEY,
  VALIDATE_SCHEMA_KEY,
  COMPRESS_METADATA_KEY,
  TRANSFORM_MAPPER_KEY,
  DECORATOR_PRIORITY,
} from './constants';
export type { DecoratorType } from './constants';

// ─── Interfaces ───────────────────────────────────────────────────────────────
export type {
  DecoratorEntry,
  ComposableMetadata,
  ComposedMethodMetadata,
  MergeStrategy,
  MergePolicy,
} from './interfaces/composition.interface';
export { DEFAULT_MERGE_POLICY } from './interfaces/composition.interface';

export type {
  ParamDecoratorEntry,
  ParamSource,
} from './interfaces/parameter-metadata.interface';

// ─── Decorators ──────────────────────────────────────────────────────────────
export { Composable } from './decorators/composable.decorator';

export { Auth } from './decorators/auth.decorator';
export type { AuthOptions } from './decorators/auth.decorator';

// ComposedRateLimit is exported as RateLimit for a clean public API.
export { ComposedRateLimit as RateLimit } from './decorators/rate-limit.decorator';
export type { ComposedRateLimitOptions as RateLimitOptions } from './decorators/rate-limit.decorator';

export { Validate } from './decorators/validate.decorator';
export type { ValidationSchema } from './decorators/validate.decorator';

export { Cache } from './decorators/cache.decorator';

export { Log } from './decorators/log.decorator';
export type { LogLevel } from './decorators/log.decorator';

export { Compress } from './decorators/compress.decorator';

export { Transform } from './decorators/transform.decorator';
export type { OutputMapper } from './decorators/transform.decorator';

export {
  Param,
  Query,
  Body,
  CustomParam,
} from './decorators/param.decorator';

// ─── Guards & Interceptors (for manual registration) ─────────────────────────
export { CompositionGuard } from './guards/composition.guard';
export { CompositionInterceptor } from './interceptors/composition.interceptor';
