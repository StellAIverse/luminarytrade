import { SetMetadata, Inject } from "@nestjs/common";
import { AuditEventType, AuditStatus } from "../entities/audit-log.entity";
import { LogActionParams } from "../audit-log.service";

export const AUDITABLE_KEY = "auditable_metadata";

export interface AuditableOptions {
  /** The event type to record */
  action: AuditEventType;
  /** Entity class name for context */
  entityType?: string;
  /**
   * A function that receives the original method arguments and returns
   * an entityId to store.  Defaults to args[0]?.id ?? args[0].
   */
  entityIdResolver?: (...args: unknown[]) => string | undefined;
  /**
   * Whether to capture `result` as `newValues`.
   * Avoid for large responses.
   */
  captureResult?: boolean;
  /** Extra static metadata merged into every entry */
  metadata?: Record<string, unknown>;
}

/**
 * Method decorator that transparently wraps NestJS service methods with
 * before/after audit log entries.
 *
 * Usage:
 *   @Auditable({ action: AuditEventType.RECORD_UPDATED, entityType: 'User' })
 *   async updateUser(id: string, dto: UpdateUserDto) { ... }
 *
 * The decorator reads `AuditLogService` from the class instance via
 * convention: the property must be named `auditLogService`.
 * If not present the call proceeds silently without audit.
 */
export function Auditable(options: AuditableOptions): MethodDecorator {
  return function (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value as (
      ...args: unknown[]
    ) => Promise<unknown>;

    descriptor.value = async function (this: any, ...args: unknown[]) {
      const auditService = this.auditLogService;
      const start = Date.now();

      let result: unknown;
      let status = AuditStatus.SUCCESS;
      let errorDetails: Record<string, unknown> | undefined;

      try {
        result = await originalMethod.apply(this, args);
        return result;
      } catch (err) {
        status = AuditStatus.FAILURE;
        errorDetails = {
          message: err?.message,
          code: err?.code,
        };
        throw err;
      } finally {
        const durationMs = Date.now() - start;

        if (auditService) {
          const entityId = options.entityIdResolver
            ? options.entityIdResolver(...args)
            : typeof args[0] === "string"
              ? args[0]
              : (args[0] as any)?.id;

          const params: LogActionParams = {
            action: options.action,
            entityType: options.entityType ?? target.constructor.name,
            entityId: entityId ? String(entityId) : undefined,
            status,
            errorDetails,
            metadata: {
              method: String(propertyKey),
              durationMs,
              ...options.metadata,
            },
            ...(options.captureResult && result
              ? { newValues: result as Record<string, unknown> }
              : {}),
          };

          // Non-blocking – we do not await to avoid adding latency
          auditService.logAction(params).catch((e: Error) => {
            // Swallow: audit failure must never break the main flow
          });
        }
      }
    };

    return descriptor;
  };
}
