import { SetMetadata } from '@nestjs/common';
import { COMPOSABLE_METADATA_KEY } from '../constants';
import { ComposableMetadata } from '../interfaces/composition.interface';

/**
 * @Composable() — opt-in marker for the decorator composition system.
 *
 * The CompositionGuard and CompositionInterceptor short-circuit immediately
 * for any method/class that does NOT carry this key, so there is zero overhead
 * on routes that have not opted in.
 *
 * Can be applied to a class (opt-in all methods) or to a single method.
 *
 * @example
 * @Composable()
 * @Controller('users')
 * export class UsersController { ... }
 *
 * @example
 * @Composable()
 * @Auth({ roles: ['admin'] })
 * @Cache(300)
 * getProfile() { ... }
 */
export const Composable = (): MethodDecorator & ClassDecorator => {
  return (
    target: any,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    const metadata: ComposableMetadata = {
      composable: true,
      className: target.constructor?.name ?? target.name,
      methodName: propertyKey ? String(propertyKey) : undefined,
    };

    if (descriptor) {
      // Method decorator path
      SetMetadata(COMPOSABLE_METADATA_KEY, metadata)(
        target,
        propertyKey as string,
        descriptor,
      );
      return descriptor;
    }

    // Class decorator path
    SetMetadata(COMPOSABLE_METADATA_KEY, metadata)(target);
  };
};
