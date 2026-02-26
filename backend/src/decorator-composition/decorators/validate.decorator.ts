import { SetMetadata } from '@nestjs/common';
import {
  DECORATOR_PRIORITY,
  COMPOSITION_STACK_KEY,
  VALIDATE_SCHEMA_KEY,
} from '../constants';
import { bufferDecoratorEntry } from '../metadata-registry.service';
import { DecoratorEntry } from '../interfaces/composition.interface';

/**
 * Minimal validation schema interface — duck-typed so it works with Joi, Zod,
 * class-validator wrappers, or any custom validator.
 */
export interface ValidationSchema {
  validate(data: unknown): { valid: boolean; errors?: string[] };
}

/**
 * @Validate(schema) — composable request-body validation.
 *
 * Stores the schema in NestJS metadata. The CompositionInterceptor reads it
 * and calls schema.validate(req.body) BEFORE the handler executes.
 * If validation fails, a BadRequestException is thrown immediately.
 *
 * Execution priority: 30 (after AUTH/RATE_LIMIT, before CACHE/LOG/TRANSFORM).
 *
 * @example
 * const createOrderSchema: ValidationSchema = {
 *   validate: (data: any) => ({
 *     valid: !!data?.amount && data.amount > 0,
 *     errors: data?.amount ? [] : ['amount must be positive'],
 *   }),
 * };
 *
 * @Composable()
 * @Auth({ resource: 'orders', action: Action.CREATE })
 * @Validate(createOrderSchema)
 * createOrder(@Body() dto: CreateOrderDto) { ... }
 */
export const Validate = (schema: ValidationSchema): MethodDecorator => {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const className = target.constructor.name;
    const methodName = String(propertyKey);

    const entry: DecoratorEntry = {
      type: 'VALIDATE',
      priority: DECORATOR_PRIORITY.VALIDATE,
      options: { schema },
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

    // Store schema for Reflector access in the interceptor
    SetMetadata(VALIDATE_SCHEMA_KEY, schema)(target, propertyKey, descriptor);
    return descriptor;
  };
};
