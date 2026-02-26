import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { Action } from '../../common/constant/actions.enum';
import { DECORATOR_PRIORITY, COMPOSITION_STACK_KEY } from '../constants';
import { bufferDecoratorEntry } from '../metadata-registry.service';
import { DecoratorEntry } from '../interfaces/composition.interface';

export interface AuthOptions {
  /** Optional role names (informational — stored in metadata for introspection) */
  roles?: string[];
  /** Resource identifier forwarded to RequirePermission */
  resource?: string;
  /** Action forwarded to RequirePermission */
  action?: Action;
}

/**
 * @Auth(options) — composable authentication + permission decorator.
 *
 * Applies JwtAuthGuard and (optionally) PermissionGuard via applyDecorators,
 * then registers an AUTH entry in the composition metadata system.
 *
 * Execution priority: 10 (runs first, before all other composed phases).
 * Early termination: if JWT or permission check fails, NestJS guard chain
 * stops and the interceptor never runs.
 *
 * @example
 * @Composable()
 * @Auth({ resource: 'profile', action: Action.READ })
 * @Cache(60)
 * getProfile() { ... }
 */
export const Auth = (options: AuthOptions = {}): MethodDecorator => {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const className = target.constructor.name;
    const methodName = String(propertyKey);

    const entry: DecoratorEntry = {
      type: 'AUTH',
      priority: DECORATOR_PRIORITY.AUTH,
      options,
    };

    // Register in pre-init buffer for MetadataRegistryService
    bufferDecoratorEntry(className, methodName, entry);

    // Also write onto the Reflector-readable stack for runtime introspection
    const existingStack: DecoratorEntry[] =
      Reflect.getMetadata(COMPOSITION_STACK_KEY, target, propertyKey) ?? [];
    Reflect.defineMetadata(
      COMPOSITION_STACK_KEY,
      [...existingStack, entry],
      target,
      propertyKey,
    );

    // Compose the real NestJS guards
    const decoratorsToApply: (MethodDecorator | ClassDecorator)[] = [
      UseGuards(JwtAuthGuard, PermissionGuard) as MethodDecorator,
    ];

    if (options.resource && options.action) {
      decoratorsToApply.push(
        RequirePermission(options.resource, options.action) as MethodDecorator,
      );
    }

    applyDecorators(...decoratorsToApply)(target, propertyKey, descriptor);
    return descriptor;
  };
};
