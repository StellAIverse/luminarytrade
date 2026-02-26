import { Logger } from '@nestjs/common';
import { DECORATOR_PRIORITY, COMPOSITION_STACK_KEY } from '../constants';
import { bufferDecoratorEntry } from '../metadata-registry.service';
import { DecoratorEntry } from '../interfaces/composition.interface';

export type LogLevel = 'log' | 'debug' | 'verbose' | 'warn' | 'error';

/**
 * @Log(level?) — composable structured logging decorator.
 *
 * Wraps the method descriptor to emit a structured log entry on invocation
 * and on resolution or rejection, including elapsed time in milliseconds.
 *
 * Execution priority: 50 (after CACHE, before TRANSFORM/COMPRESS).
 *
 * When two @Log decorators are stacked (e.g. @Log('debug') + @Log('warn')),
 * the merge strategy is 'merge', so both level values end up in the options
 * object (last key wins within the merge). The descriptor wrapping applied
 * here uses the level value supplied at decoration time.
 *
 * @example
 * @Composable()
 * @Log('debug')
 * @Cache(120)
 * getOrders() { ... }
 */
export const Log = (level: LogLevel = 'log'): MethodDecorator => {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const className = target.constructor.name;
    const methodName = String(propertyKey);
    const logger = new Logger(`${className}.${methodName}`);
    const original = descriptor.value as (...args: unknown[]) => unknown;

    const entry: DecoratorEntry = {
      type: 'LOG',
      priority: DECORATOR_PRIORITY.LOG,
      options: { level },
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

    const wrapper = async function (...args: unknown[]) {
      const start = Date.now();
      logger[level](`→ ${methodName}`, { argsCount: args.length });
      try {
        const result = await original.apply(this, args);
        logger[level](`← ${methodName}`, { durationMs: Date.now() - start });
        return result;
      } catch (err) {
        logger.error(`✗ ${methodName}`, {
          durationMs: Date.now() - start,
          error: (err as Error).message,
        });
        throw err;
      }
    };

    // Copy all NestJS/reflect-metadata entries from the original method function
    // to the wrapper so that route paths, guards, interceptors and other
    // decorator-stored metadata are not lost when the descriptor is replaced.
    const metaKeys: any[] = Reflect.getMetadataKeys(original) ?? [];
    metaKeys.forEach((key: any) => {
      const meta = Reflect.getMetadata(key, original);
      Reflect.defineMetadata(key, meta, wrapper);
    });

    descriptor.value = wrapper;
    return descriptor;
  };
};
