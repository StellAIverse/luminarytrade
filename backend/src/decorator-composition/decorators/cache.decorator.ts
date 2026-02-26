import { DECORATOR_PRIORITY, COMPOSITION_STACK_KEY } from '../constants';
import { bufferDecoratorEntry } from '../metadata-registry.service';
import { DecoratorEntry } from '../interfaces/composition.interface';
import { Cacheable } from '../../cache/decorators/cacheable.decorator';

/**
 * @Cache(ttl, namespace?) — composable caching decorator.
 *
 * Thin convenience wrapper over the existing @Cacheable decorator that
 * additionally registers a CACHE entry in the composition metadata system.
 *
 * Actual caching is handled by the @Cacheable descriptor wrapper; this
 * decorator does not duplicate that logic.
 *
 * Execution priority: 40 (after VALIDATE, before LOG/TRANSFORM).
 * On a cache hit the handler body is skipped entirely.
 *
 * @example
 * @Composable()
 * @Cache(300, 'profiles')
 * @Log()
 * getProfile(@Param('id') id: string) { ... }
 */
export const Cache = (ttl: number, namespace?: string): MethodDecorator => {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const className = target.constructor.name;
    const methodName = String(propertyKey);

    const entry: DecoratorEntry = {
      type: 'CACHE',
      priority: DECORATOR_PRIORITY.CACHE,
      options: { ttl, namespace },
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

    // Delegate to the existing @Cacheable for full caching behaviour
    Cacheable({ ttl, namespace })(target, propertyKey, descriptor);
    return descriptor;
  };
};
