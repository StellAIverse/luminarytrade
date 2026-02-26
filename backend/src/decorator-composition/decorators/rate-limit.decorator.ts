import { DECORATOR_PRIORITY, COMPOSITION_STACK_KEY } from '../constants';
import { bufferDecoratorEntry } from '../metadata-registry.service';
import { DecoratorEntry } from '../interfaces/composition.interface';
import {
  RateLimit as OriginalRateLimit,
} from '../../rate-limiting/decorators/rate-limit.decorator';
import { RateLimitStrategy } from '../../rate-limiting/interfaces/rate-limiter.interface';

export interface ComposedRateLimitOptions {
  requests: number;
  window: number;
  strategy: RateLimitStrategy;
}

/**
 * @ComposedRateLimit(requests, window, strategy?) — composable rate-limiting.
 *
 * Thin wrapper over the existing @RateLimit decorator that additionally
 * registers a RATE_LIMIT entry in the composition metadata system.
 *
 * Execution priority: 20 (runs after AUTH, before VALIDATE).
 * Early termination: if the rate limit is exceeded, the guard chain stops.
 *
 * Re-exported from the index barrel as `RateLimit` to avoid import confusion.
 *
 * @example
 * @Composable()
 * @Auth({ resource: 'orders', action: Action.CREATE })
 * @ComposedRateLimit(100, 60_000)
 * createOrder(@Body() dto: CreateOrderDto) { ... }
 */
export const ComposedRateLimit = (
  requests: number,
  window: number,
  strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW,
): MethodDecorator => {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const className = target.constructor.name;
    const methodName = String(propertyKey);

    const entry: DecoratorEntry = {
      type: 'RATE_LIMIT',
      priority: DECORATOR_PRIORITY.RATE_LIMIT,
      options: { requests, window, strategy },
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

    // Delegate actual rate-limit logic to the existing decorator + guard
    OriginalRateLimit(requests, window, strategy)(target, propertyKey, descriptor);
    return descriptor;
  };
};
