import { SetMetadata } from '@nestjs/common';
import {
  DECORATOR_PRIORITY,
  COMPOSITION_STACK_KEY,
  TRANSFORM_MAPPER_KEY,
} from '../constants';
import { bufferDecoratorEntry } from '../metadata-registry.service';
import { DecoratorEntry } from '../interfaces/composition.interface';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OutputMapper<T = any, R = any> = (output: T) => R;

/**
 * @Transform(mapper) — composable output transformation decorator.
 *
 * Stores a mapping function in metadata. The CompositionInterceptor applies
 * it via RxJS `pipe(map(mapper))` after the handler returns, transforming the
 * response before it is serialised and sent to the client.
 *
 * Execution priority: 60 (after LOG, before COMPRESS).
 * Merge strategy: last-wins — the innermost @Transform mapper takes effect.
 *
 * @example
 * @Composable()
 * @Transform(items => ({ data: items, count: items.length }))
 * listOrders() { ... }
 */
export const Transform = (mapper: OutputMapper): MethodDecorator => {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const className = target.constructor.name;
    const methodName = String(propertyKey);

    const entry: DecoratorEntry = {
      type: 'TRANSFORM',
      priority: DECORATOR_PRIORITY.TRANSFORM,
      options: { mapper },
    };

    bufferDecoratorEntry(className, methodName, entry);

    const existingStack: DecoratorEntry[] =
      Reflect.getMetadata(COMPOSITION_STACK_KEY, target, propertyKey) ?? [];
    Reflect.defineMetadata(
      COMPOSITION_STACK_KEY,
      [...existingStack, entry],
      target,
      propertyKey,
    );

    SetMetadata(TRANSFORM_MAPPER_KEY, mapper)(target, propertyKey, descriptor);
    return descriptor;
  };
};
