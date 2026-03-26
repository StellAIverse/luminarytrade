import { ErrorCodes } from "./constants/error-codes";
import {
  StructuredException,
  StructuredExceptionOptions,
} from "./errors/structured-exception";

type CategoryOptions = Omit<StructuredExceptionOptions, "code"> & {
  code?: StructuredExceptionOptions["code"];
};

// ─────────────────────────────────────────────────────────────────────────────
// AuthenticationException
// ─────────────────────────────────────────────────────────────────────────────
export class AuthenticationException extends StructuredException {
  constructor(opts: CategoryOptions) {
    super({
      code: ErrorCodes.AUTH_TOKEN_INVALID_401,
      retryable: false,
      ...opts,
    });
  }

  static tokenExpired(details?: Record<string, unknown>) {
    return new AuthenticationException({
      code: ErrorCodes.AUTH_TOKEN_EXPIRED_401,
      message: "The access token has expired. Please refresh your session.",
      retryable: false,
      details,
    });
  }

  static tokenMissing() {
    return new AuthenticationException({
      code: ErrorCodes.AUTH_TOKEN_MISSING_401,
      message: "No authentication token was provided.",
      retryable: false,
    });
  }

  static insufficientPermissions(resource?: string) {
    return new AuthenticationException({
      code: ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS_403,
      message: `You do not have permission to access ${resource ?? "this resource"}.`,
      retryable: false,
      details: resource ? { resource } : {},
    });
  }

  static walletNotVerified(wallet: string) {
    return new AuthenticationException({
      code: ErrorCodes.AUTH_WALLET_NOT_VERIFIED_403,
      message: `Wallet ${wallet} has not been verified.`,
      retryable: false,
      details: { wallet },
    });
  }

  static signatureInvalid() {
    return new AuthenticationException({
      code: ErrorCodes.AUTH_SIGNATURE_INVALID_401,
      message: "The provided signature is invalid or could not be verified.",
      retryable: false,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ValidationException
// ─────────────────────────────────────────────────────────────────────────────
export class ValidationException extends StructuredException {
  constructor(opts: CategoryOptions) {
    super({
      code: ErrorCodes.VALIDATION_INVALID_FORMAT_400,
      retryable: false,
      ...opts,
    });
  }

  static requiredField(field: string) {
    return new ValidationException({
      code: ErrorCodes.VALIDATION_REQUIRED_FIELD_400,
      message: `Required field '${field}' is missing.`,
      details: { field },
    });
  }

  static invalidFormat(field: string, expected?: string) {
    return new ValidationException({
      code: ErrorCodes.VALIDATION_INVALID_FORMAT_400,
      message: `Field '${field}' has an invalid format${expected ? `: expected ${expected}` : ""}.`,
      details: { field, expected },
    });
  }

  static outOfRange(field: string, min?: number, max?: number) {
    return new ValidationException({
      code: ErrorCodes.VALIDATION_OUT_OF_RANGE_400,
      message: `Field '${field}' is out of allowed range [${min ?? "-∞"}, ${max ?? "∞"}].`,
      details: { field, min, max },
    });
  }

  static duplicateValue(field: string, value: unknown) {
    return new ValidationException({
      code: ErrorCodes.VALIDATION_DUPLICATE_VALUE_409,
      message: `Value for '${field}' already exists.`,
      details: { field, value },
    });
  }

  static invalidAddress(address: string) {
    return new ValidationException({
      code: ErrorCodes.VALIDATION_INVALID_ADDRESS_400,
      message: `The address '${address}' is not a valid blockchain address.`,
      details: { address },
    });
  }

  /** Converts class-validator errors array into a single ValidationException */
  static fromClassValidator(
    errors: { property: string; constraints?: Record<string, string> }[],
  ) {
    const details = errors.reduce<Record<string, string[]>>((acc, e) => {
      acc[e.property] = Object.values(e.constraints ?? {});
      return acc;
    }, {});

    return new ValidationException({
      code: ErrorCodes.VALIDATION_SCHEMA_MISMATCH_400,
      message: "One or more fields failed validation.",
      details,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BlockchainException
// ─────────────────────────────────────────────────────────────────────────────
export class BlockchainException extends StructuredException {
  constructor(opts: CategoryOptions) {
    super({
      code: ErrorCodes.BLOCKCHAIN_TX_FAILED_500,
      retryable: true,
      ...opts,
    });
  }

  static transactionFailed(txHash?: string, reason?: string) {
    return new BlockchainException({
      code: ErrorCodes.BLOCKCHAIN_TX_FAILED_500,
      message: `Blockchain transaction failed${reason ? `: ${reason}` : ""}.`,
      retryable: true,
      details: { txHash, reason },
    });
  }

  static transactionReverted(txHash: string, revertReason: string) {
    return new BlockchainException({
      code: ErrorCodes.BLOCKCHAIN_TX_REVERTED_400,
      message: `Transaction ${txHash} was reverted: ${revertReason}`,
      retryable: false,
      details: { txHash, revertReason },
    });
  }

  static insufficientFunds(
    wallet: string,
    required: string,
    available: string,
  ) {
    return new BlockchainException({
      code: ErrorCodes.BLOCKCHAIN_INSUFFICIENT_FUNDS_402,
      message: `Insufficient funds in wallet ${wallet}.`,
      retryable: false,
      details: { wallet, required, available },
    });
  }

  static networkError(network: string, cause?: Error) {
    return new BlockchainException({
      code: ErrorCodes.BLOCKCHAIN_NETWORK_ERROR_503,
      message: `Blockchain network '${network}' is currently unreachable.`,
      retryable: true,
      details: { network },
      cause,
    });
  }

  static rpcTimeout(endpoint: string) {
    return new BlockchainException({
      code: ErrorCodes.BLOCKCHAIN_RPC_TIMEOUT_504,
      message: `RPC endpoint '${endpoint}' timed out.`,
      retryable: true,
      details: { endpoint },
    });
  }

  static simulationFailed(reason: string) {
    return new BlockchainException({
      code: ErrorCodes.BLOCKCHAIN_SIMULATION_FAILED_400,
      message: `Transaction simulation failed: ${reason}`,
      retryable: false,
      details: { reason },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AIServiceException
// ─────────────────────────────────────────────────────────────────────────────
export class AIServiceException extends StructuredException {
  constructor(opts: CategoryOptions) {
    super({
      code: ErrorCodes.AI_SERVICE_UNAVAILABLE_503,
      retryable: true,
      ...opts,
    });
  }

  static unavailable(service?: string) {
    return new AIServiceException({
      code: ErrorCodes.AI_SERVICE_UNAVAILABLE_503,
      message: `AI service${service ? ` '${service}'` : ""} is currently unavailable.`,
      retryable: true,
      details: { service },
    });
  }

  static timeout(service?: string) {
    return new AIServiceException({
      code: ErrorCodes.AI_SERVICE_TIMEOUT_504,
      message: `AI service${service ? ` '${service}'` : ""} request timed out.`,
      retryable: true,
      details: { service },
    });
  }

  static quotaExceeded(service?: string) {
    return new AIServiceException({
      code: ErrorCodes.AI_SERVICE_QUOTA_EXCEEDED_429,
      message:
        "AI service quota has been exceeded. Please wait before retrying.",
      retryable: true,
      details: { service },
    });
  }

  static contentFiltered(reason?: string) {
    return new AIServiceException({
      code: ErrorCodes.AI_SERVICE_CONTENT_FILTERED_422,
      message: `Content was filtered by AI safety checks${reason ? `: ${reason}` : ""}.`,
      retryable: false,
      details: { reason },
    });
  }

  static invalidResponse(service?: string) {
    return new AIServiceException({
      code: ErrorCodes.AI_SERVICE_RESPONSE_INVALID_502,
      message: `AI service${service ? ` '${service}'` : ""} returned an invalid response.`,
      retryable: true,
      details: { service },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DatabaseException
// ─────────────────────────────────────────────────────────────────────────────
export class DatabaseException extends StructuredException {
  constructor(opts: CategoryOptions) {
    super({
      code: ErrorCodes.DATABASE_CONNECTION_FAILED_503,
      retryable: false,
      ...opts,
    });
  }

  static recordNotFound(entity: string, id: string | number) {
    return new DatabaseException({
      code: ErrorCodes.DATABASE_RECORD_NOT_FOUND_404,
      message: `${entity} with id '${id}' was not found.`,
      retryable: false,
      details: { entity, id },
    });
  }

  static uniqueViolation(field: string, value: unknown) {
    return new DatabaseException({
      code: ErrorCodes.DATABASE_UNIQUE_VIOLATION_409,
      message: `A record with ${field}='${value}' already exists.`,
      retryable: false,
      details: { field, value },
    });
  }

  static queryTimeout(query?: string) {
    return new DatabaseException({
      code: ErrorCodes.DATABASE_QUERY_TIMEOUT_504,
      message: "Database query timed out.",
      retryable: true,
      details: { query },
    });
  }

  static connectionFailed(host?: string) {
    return new DatabaseException({
      code: ErrorCodes.DATABASE_CONNECTION_FAILED_503,
      message: `Failed to connect to the database${host ? ` at ${host}` : ""}.`,
      retryable: true,
      details: { host },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RateLimitException
// ─────────────────────────────────────────────────────────────────────────────
export class RateLimitException extends StructuredException {
  readonly retryAfter: number;

  constructor(opts: CategoryOptions & { retryAfter?: number }) {
    super({
      code: ErrorCodes.RATE_LIMIT_EXCEEDED_429,
      retryable: true,
      ...opts,
    });
    this.retryAfter = opts.retryAfter ?? 60;
  }

  static exceeded(retryAfter: number, key?: string) {
    return new RateLimitException({
      code: ErrorCodes.RATE_LIMIT_EXCEEDED_429,
      message: `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
      retryable: true,
      retryAfter,
      details: { retryAfter, key },
    });
  }

  static ipBlocked(ip: string, retryAfter: number) {
    return new RateLimitException({
      code: ErrorCodes.RATE_LIMIT_IP_BLOCKED_429,
      message: `IP address ${ip} has been rate-limited.`,
      retryable: true,
      retryAfter,
      details: { ip, retryAfter },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ExternalServiceException
// ─────────────────────────────────────────────────────────────────────────────
export class ExternalServiceException extends StructuredException {
  constructor(opts: CategoryOptions) {
    super({
      code: ErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE_503,
      retryable: true,
      ...opts,
    });
  }

  static unavailable(service: string, cause?: Error) {
    return new ExternalServiceException({
      code: ErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE_503,
      message: `External service '${service}' is currently unavailable.`,
      retryable: true,
      details: { service },
      cause,
    });
  }

  static timeout(service: string) {
    return new ExternalServiceException({
      code: ErrorCodes.EXTERNAL_SERVICE_TIMEOUT_504,
      message: `Request to external service '${service}' timed out.`,
      retryable: true,
      details: { service },
    });
  }

  static authFailed(service: string) {
    return new ExternalServiceException({
      code: ErrorCodes.EXTERNAL_SERVICE_AUTH_FAILED_502,
      message: `Authentication with external service '${service}' failed.`,
      retryable: false,
      details: { service },
    });
  }
}
