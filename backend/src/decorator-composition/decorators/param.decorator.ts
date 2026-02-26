import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PARAM_METADATA_KEY } from '../constants';
import { ParamDecoratorEntry, ParamSource } from '../interfaces/parameter-metadata.interface';

// ─── Internal helper ─────────────────────────────────────────────────────────

function recordParamEntry(
  target: object,
  methodName: string,
  index: number,
  source: ParamSource,
  key?: string,
  extractor?: (req: any) => any,
): void {
  const existing: ParamDecoratorEntry[] =
    Reflect.getMetadata(PARAM_METADATA_KEY, target, methodName) ?? [];
  existing.push({ index, source, key, extractor });
  Reflect.defineMetadata(PARAM_METADATA_KEY, existing, target, methodName);
}

// ─── Composable Parameter Decorators ─────────────────────────────────────────

/**
 * @Param(key?) — extract a route parameter from req.params.
 *
 * Wraps NestJS's own param extraction and stores a ParamDecoratorEntry so
 * the composition system can introspect parameter metadata at request time.
 *
 * @example
 * getUser(@Param('id') id: string) { ... }
 */
export const Param = (key?: string): ParameterDecorator => {
  const factory = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
      const req = ctx.switchToHttp().getRequest();
      return data ? req.params?.[data] : req.params;
    },
  );

  const nestDecorator = factory(key);

  return (target: object, propertyKey: string | symbol, parameterIndex: number) => {
    recordParamEntry(target, String(propertyKey), parameterIndex, 'param', key);
    nestDecorator(target, propertyKey, parameterIndex);
  };
};

/**
 * @Query(key?) — extract a query-string parameter from req.query.
 *
 * @example
 * search(@Query('q') q: string) { ... }
 */
export const Query = (key?: string): ParameterDecorator => {
  const factory = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
      const req = ctx.switchToHttp().getRequest();
      return data ? req.query?.[data] : req.query;
    },
  );

  const nestDecorator = factory(key);

  return (target: object, propertyKey: string | symbol, parameterIndex: number) => {
    recordParamEntry(target, String(propertyKey), parameterIndex, 'query', key);
    nestDecorator(target, propertyKey, parameterIndex);
  };
};

/**
 * @Body(key?) — extract the request body or a field from it.
 *
 * @example
 * create(@Body() dto: CreateOrderDto) { ... }
 * create(@Body('amount') amount: number) { ... }
 */
export const Body = (key?: string): ParameterDecorator => {
  const factory = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
      const req = ctx.switchToHttp().getRequest();
      return data ? req.body?.[data] : req.body;
    },
  );

  const nestDecorator = factory(key);

  return (target: object, propertyKey: string | symbol, parameterIndex: number) => {
    recordParamEntry(target, String(propertyKey), parameterIndex, 'body', key);
    nestDecorator(target, propertyKey, parameterIndex);
  };
};

/**
 * @CustomParam(extractor) — extract an arbitrary value from the request using
 * a custom extractor function.
 *
 * @example
 * getUser(@CustomParam(req => req.user.id) userId: string) { ... }
 */
export const CustomParam = (extractor: (req: any) => any): ParameterDecorator => {
  const factory = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext) => {
      return extractor(ctx.switchToHttp().getRequest());
    },
  );

  const nestDecorator = factory();

  return (target: object, propertyKey: string | symbol, parameterIndex: number) => {
    recordParamEntry(
      target,
      String(propertyKey),
      parameterIndex,
      'custom',
      undefined,
      extractor,
    );
    nestDecorator(target, propertyKey, parameterIndex);
  };
};
