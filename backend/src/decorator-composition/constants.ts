// ─── Metadata Keys ───────────────────────────────────────────────────────────

/** Written by @Composable — gates the guard and interceptor */
export const COMPOSABLE_METADATA_KEY = 'composition:composable';

/** Reflector-readable stack of DecoratorEntry objects per method */
export const COMPOSITION_STACK_KEY = 'composition:stack';

/** Metadata key under which the sorted composition order is stored */
export const COMPOSITION_ORDER_KEY = 'composition:order';

/** Parameter decorator metadata stored per method on the prototype */
export const PARAM_METADATA_KEY = 'composition:params';

/** Schema stored by @Validate */
export const VALIDATE_SCHEMA_KEY = 'composition:validate:schema';

/** Flag stored by @Compress */
export const COMPRESS_METADATA_KEY = 'composition:compress';

/** Mapper function stored by @Transform */
export const TRANSFORM_MAPPER_KEY = 'composition:transform:mapper';

// ─── Execution Priority ───────────────────────────────────────────────────────
// Lower number = runs first.
// AUTH and RATE_LIMIT run in the guard phase (early termination possible).
// VALIDATE runs in the interceptor phase before the handler.
// CACHE runs inside the handler descriptor wrapper.
// LOG wraps the descriptor and measures duration.
// TRANSFORM and COMPRESS are applied after the handler returns.

export const DECORATOR_PRIORITY = {
  AUTH: 10,
  RATE_LIMIT: 20,
  VALIDATE: 30,
  CACHE: 40,
  LOG: 50,
  TRANSFORM: 60,
  COMPRESS: 70,
} as const;

export type DecoratorType = keyof typeof DECORATOR_PRIORITY;
