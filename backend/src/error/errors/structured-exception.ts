import { ErrorCode, extractHttpStatus } from "../constants/error-codes";

export interface StructuredExceptionOptions {
  code: ErrorCode;
  message: string;
  httpStatus?: number;
  details?: Record<string, unknown>;
  requestId?: string;
  retryable?: boolean;
  cause?: Error;
}

/**
 * Base exception class for all application errors.
 * Extends the native Error with structured fields for consistent API responses.
 */
export class StructuredException extends Error {
  /** Machine-readable error code, e.g. AUTH_TOKEN_EXPIRED_401 */
  readonly code: ErrorCode;

  /** HTTP status code derived from the error code suffix (overridable) */
  readonly httpStatus: number;

  /** Human-readable description */
  override readonly message: string;

  /** Optional structured payload with error context */
  readonly details: Record<string, unknown>;

  /** ISO-8601 timestamp of when the exception was created */
  readonly timestamp: string;

  /** Correlation ID for distributed tracing (set at filter level if absent) */
  requestId: string | undefined;

  /** Whether the caller may safely retry the operation */
  readonly retryable: boolean;

  /** Original cause, preserved for debugging */
  readonly cause: Error | undefined;

  constructor(opts: StructuredExceptionOptions) {
    super(opts.message);

    // Restore prototype chain (required when extending built-ins)
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = new.target.name;
    this.code = opts.code;
    this.message = opts.message;
    this.httpStatus = opts.httpStatus ?? extractHttpStatus(opts.code);
    this.details = opts.details ?? {};
    this.timestamp = new Date().toISOString();
    this.requestId = opts.requestId;
    this.retryable = opts.retryable ?? false;
    this.cause = opts.cause;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }

  /** Serialise to the standard error response envelope */
  toResponseBody(): {
    statusCode: number;
    error: {
      code: ErrorCode;
      message: string;
      details: Record<string, unknown>;
      requestId: string | undefined;
      timestamp: string;
      retryable: boolean;
    };
  } {
    return {
      statusCode: this.httpStatus,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        requestId: this.requestId,
        timestamp: this.timestamp,
        retryable: this.retryable,
      },
    };
  }
}
