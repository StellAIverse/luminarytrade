import {
  Injectable,
  CanActivate,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { COMPOSABLE_METADATA_KEY, DECORATOR_PRIORITY } from '../constants';
import { MetadataRegistryService } from '../metadata-registry.service';

/**
 * CompositionGuard — global guard for the decorator composition system.
 *
 * Responsibilities:
 *  1. Short-circuit immediately (return true) for any route that has not been
 *     marked @Composable(), so there is zero overhead on non-participating routes.
 *  2. Validate decorator ordering integrity at request time: AUTH must have a
 *     lower priority number than VALIDATE, which must be lower than TRANSFORM, etc.
 *     This catches misconfiguration early rather than silently producing wrong
 *     behaviour.
 *
 * Note: AUTH enforcement (JwtAuthGuard / PermissionGuard) and RATE_LIMIT
 * enforcement (RateLimitGuard) are applied directly by @Auth and
 * @ComposedRateLimit via UseGuards — this guard does not duplicate them.
 * It runs in the same guard phase and provides compositional integrity checks.
 *
 * Registered as APP_GUARD in DecoratorCompositionModule.
 */
@Injectable()
export class CompositionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly registry: MetadataRegistryService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isComposable = this.reflector.getAllAndOverride(
      COMPOSABLE_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Not opted in → pass through immediately
    if (!isComposable) return true;

    const handler = context.getHandler();
    const controller = context.getClass();

    const composed = this.registry.getComposedMetadata(
      controller.name,
      handler.name,
    );

    // ── Ordering integrity checks ─────────────────────────────────────────
    // Verify that the declared priority ordering matches the canonical table.
    // This catches cases where a custom decorator was registered with a wrong
    // priority value.

    const byType = new Map(composed.stack.map(e => [e.type, e.priority]));

    const authPriority = byType.get('AUTH');
    const rateLimitPriority = byType.get('RATE_LIMIT');
    const validatePriority = byType.get('VALIDATE');
    const cachePriority = byType.get('CACHE');
    const transformPriority = byType.get('TRANSFORM');
    const compressPriority = byType.get('COMPRESS');

    if (authPriority !== undefined && validatePriority !== undefined) {
      if (authPriority >= validatePriority) {
        throw new InternalServerErrorException(
          `Composition ordering violation on ${controller.name}.${handler.name}: ` +
          `AUTH priority (${authPriority}) must be less than VALIDATE priority (${validatePriority}).`,
        );
      }
    }

    if (rateLimitPriority !== undefined && validatePriority !== undefined) {
      if (rateLimitPriority >= validatePriority) {
        throw new InternalServerErrorException(
          `Composition ordering violation on ${controller.name}.${handler.name}: ` +
          `RATE_LIMIT priority (${rateLimitPriority}) must be less than VALIDATE priority (${validatePriority}).`,
        );
      }
    }

    if (validatePriority !== undefined && cachePriority !== undefined) {
      if (validatePriority >= cachePriority) {
        throw new InternalServerErrorException(
          `Composition ordering violation on ${controller.name}.${handler.name}: ` +
          `VALIDATE priority (${validatePriority}) must be less than CACHE priority (${cachePriority}).`,
        );
      }
    }

    if (
      transformPriority !== undefined &&
      compressPriority !== undefined &&
      transformPriority >= compressPriority
    ) {
      throw new InternalServerErrorException(
        `Composition ordering violation on ${controller.name}.${handler.name}: ` +
        `TRANSFORM priority (${transformPriority}) must be less than COMPRESS priority (${compressPriority}).`,
      );
    }

    // Only verify canonical priorities match expected values
    for (const entry of composed.stack) {
      const expected = DECORATOR_PRIORITY[entry.type];
      if (expected !== undefined && entry.priority !== expected) {
        throw new InternalServerErrorException(
          `Composition priority mismatch on ${controller.name}.${handler.name}: ` +
          `decorator type ${entry.type} has priority ${entry.priority} but expected ${expected}.`,
        );
      }
    }

    return true;
  }
}
