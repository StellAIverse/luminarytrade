import { SetMetadata } from '@nestjs/common';
import {
  DECORATOR_PRIORITY,
  COMPOSITION_STACK_KEY,
  COMPRESS_METADATA_KEY,
} from '../constants';
import { bufferDecoratorEntry } from '../metadata-registry.service';
import { DecoratorEntry } from '../interfaces/composition.interface';

/**
 * @Compress() — composable compression hint decorator.
 *
 * Stores a flag in metadata that the CompositionInterceptor reads to set an
 * `X-Composition-Compress: true` response header. Actual body compression is
 * handled by the Express/Fastify compression middleware configured at the
 * application level; this decorator signals the intent and participates in
 * the composition metadata system.
 *
 * Execution priority: 70 (last — applied after all other phases).
 *
 * @example
 * @Composable()
 * @Compress()
 * @Transform(data => ({ items: data }))
 * listItems() { ... }
 */
export const Compress = (): MethodDecorator => {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const className = target.constructor.name;
    const methodName = String(propertyKey);

    const entry: DecoratorEntry = {
      type: 'COMPRESS',
      priority: DECORATOR_PRIORITY.COMPRESS,
      options: { compress: true },
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

    SetMetadata(COMPRESS_METADATA_KEY, true)(target, propertyKey, descriptor);
    return descriptor;
  };
};
