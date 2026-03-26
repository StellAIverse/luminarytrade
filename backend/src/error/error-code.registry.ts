import {
  ErrorCodes,
  ErrorCode,
  extractCategory,
  extractHttpStatus,
} from "./constants/error-codes";

export interface ErrorCodeEntry {
  code: ErrorCode;
  category: string;
  httpStatus: number;
  description: string;
  retryable: boolean;
}

const descriptions: Record<
  ErrorCode,
  { description: string; retryable: boolean }
> = {
  // AUTH
  AUTH_TOKEN_EXPIRED_401: {
    description: "Access token has expired",
    retryable: false,
  },
  AUTH_TOKEN_INVALID_401: {
    description: "Access token is malformed or invalid",
    retryable: false,
  },
  AUTH_TOKEN_MISSING_401: {
    description: "No authentication token provided",
    retryable: false,
  },
  AUTH_REFRESH_TOKEN_INVALID_401: {
    description: "Refresh token is invalid or revoked",
    retryable: false,
  },
  AUTH_INSUFFICIENT_PERMISSIONS_403: {
    description: "Caller lacks permission to perform this action",
    retryable: false,
  },
  AUTH_ACCOUNT_LOCKED_403: {
    description: "Account is temporarily locked",
    retryable: true,
  },
  AUTH_ACCOUNT_SUSPENDED_403: {
    description: "Account has been permanently suspended",
    retryable: false,
  },
  AUTH_SESSION_EXPIRED_401: {
    description: "User session has expired",
    retryable: false,
  },
  AUTH_MFA_REQUIRED_403: {
    description: "Multi-factor authentication is required",
    retryable: false,
  },
  AUTH_MFA_INVALID_401: {
    description: "Provided MFA code is invalid",
    retryable: false,
  },
  AUTH_WALLET_NOT_VERIFIED_403: {
    description: "Wallet ownership has not been verified",
    retryable: false,
  },
  AUTH_SIGNATURE_INVALID_401: {
    description: "Cryptographic signature could not be verified",
    retryable: false,
  },
  // VALIDATION
  VALIDATION_REQUIRED_FIELD_400: {
    description: "A required field is missing from the request",
    retryable: false,
  },
  VALIDATION_INVALID_FORMAT_400: {
    description: "A field value does not match the expected format",
    retryable: false,
  },
  VALIDATION_OUT_OF_RANGE_400: {
    description: "A field value is outside the allowed range",
    retryable: false,
  },
  VALIDATION_DUPLICATE_VALUE_409: {
    description: "A unique field already exists with this value",
    retryable: false,
  },
  VALIDATION_INVALID_ADDRESS_400: {
    description: "The supplied blockchain address is not valid",
    retryable: false,
  },
  VALIDATION_SCHEMA_MISMATCH_400: {
    description: "The request body does not match the expected schema",
    retryable: false,
  },
  VALIDATION_CONSTRAINT_VIOLATED_422: {
    description: "A business rule constraint was violated",
    retryable: false,
  },
  VALIDATION_INVALID_ENUM_400: {
    description: "A field value is not a valid enum member",
    retryable: false,
  },
  VALIDATION_MAX_LENGTH_400: {
    description: "A field exceeds the maximum allowed length",
    retryable: false,
  },
  VALIDATION_MIN_LENGTH_400: {
    description: "A field is shorter than the minimum required length",
    retryable: false,
  },
  VALIDATION_PAYLOAD_TOO_LARGE_413: {
    description: "The request payload exceeds the size limit",
    retryable: false,
  },
  VALIDATION_UNSUPPORTED_MEDIA_415: {
    description: "The Content-Type is not supported",
    retryable: false,
  },
  // BLOCKCHAIN
  BLOCKCHAIN_TX_FAILED_500: {
    description: "Blockchain transaction execution failed",
    retryable: true,
  },
  BLOCKCHAIN_TX_REVERTED_400: {
    description: "Transaction was reverted by the EVM",
    retryable: false,
  },
  BLOCKCHAIN_INSUFFICIENT_GAS_400: {
    description: "Gas limit is too low for the transaction",
    retryable: false,
  },
  BLOCKCHAIN_NONCE_TOO_LOW_400: {
    description: "Transaction nonce is lower than expected",
    retryable: false,
  },
  BLOCKCHAIN_CONTRACT_NOT_FOUND_404: {
    description: "Smart contract could not be found at the address",
    retryable: false,
  },
  BLOCKCHAIN_NETWORK_ERROR_503: {
    description: "Blockchain network is currently unreachable",
    retryable: true,
  },
  BLOCKCHAIN_RPC_TIMEOUT_504: {
    description: "RPC endpoint did not respond in time",
    retryable: true,
  },
  BLOCKCHAIN_INVALID_SIGNATURE_400: {
    description: "Submitted signature is invalid",
    retryable: false,
  },
  BLOCKCHAIN_INSUFFICIENT_FUNDS_402: {
    description: "Wallet balance is insufficient for the operation",
    retryable: false,
  },
  BLOCKCHAIN_BLOCK_NOT_FOUND_404: {
    description: "Requested block does not exist",
    retryable: false,
  },
  BLOCKCHAIN_REORG_DETECTED_503: {
    description: "Chain reorganisation detected; retry later",
    retryable: true,
  },
  BLOCKCHAIN_SIMULATION_FAILED_400: {
    description: "Transaction simulation failed before submission",
    retryable: false,
  },
  // AI_SERVICE
  AI_SERVICE_UNAVAILABLE_503: {
    description: "AI inference service is currently unavailable",
    retryable: true,
  },
  AI_SERVICE_TIMEOUT_504: {
    description: "AI inference request timed out",
    retryable: true,
  },
  AI_SERVICE_QUOTA_EXCEEDED_429: {
    description: "AI service token or request quota has been hit",
    retryable: true,
  },
  AI_SERVICE_MODEL_NOT_FOUND_404: {
    description: "Requested AI model does not exist",
    retryable: false,
  },
  AI_SERVICE_INVALID_PROMPT_400: {
    description: "The supplied prompt is invalid or empty",
    retryable: false,
  },
  AI_SERVICE_CONTENT_FILTERED_422: {
    description: "Content was blocked by AI safety filters",
    retryable: false,
  },
  AI_SERVICE_RESPONSE_INVALID_502: {
    description: "AI service returned an unexpected response format",
    retryable: true,
  },
  AI_SERVICE_COMPUTE_FAILED_500: {
    description: "AI compute node encountered an internal error",
    retryable: true,
  },
  // DATABASE
  DATABASE_CONNECTION_FAILED_503: {
    description: "Could not establish a database connection",
    retryable: true,
  },
  DATABASE_QUERY_TIMEOUT_504: {
    description: "Database query exceeded the time limit",
    retryable: true,
  },
  DATABASE_RECORD_NOT_FOUND_404: {
    description: "The requested record does not exist",
    retryable: false,
  },
  DATABASE_UNIQUE_VIOLATION_409: {
    description: "A unique index constraint was violated",
    retryable: false,
  },
  DATABASE_FK_VIOLATION_409: {
    description: "A foreign-key constraint was violated",
    retryable: false,
  },
  DATABASE_TRANSACTION_FAILED_500: {
    description: "Database transaction could not be committed",
    retryable: true,
  },
  DATABASE_MIGRATION_FAILED_500: {
    description: "A schema migration step failed",
    retryable: false,
  },
  DATABASE_POOL_EXHAUSTED_503: {
    description: "All database connections are in use",
    retryable: true,
  },
  DATABASE_READ_ONLY_503: {
    description: "Database is in read-only mode",
    retryable: true,
  },
  // RATE_LIMIT
  RATE_LIMIT_EXCEEDED_429: {
    description: "Too many requests – rate limit reached",
    retryable: true,
  },
  RATE_LIMIT_IP_BLOCKED_429: {
    description: "IP address has been rate-blocked",
    retryable: true,
  },
  RATE_LIMIT_USER_BLOCKED_429: {
    description: "User account has been rate-blocked",
    retryable: true,
  },
  RATE_LIMIT_API_KEY_BLOCKED_429: {
    description: "API key has been rate-blocked",
    retryable: true,
  },
  RATE_LIMIT_BURST_EXCEEDED_429: {
    description: "Short-burst rate limit exceeded",
    retryable: true,
  },
  RATE_LIMIT_QUOTA_EXHAUSTED_429: {
    description: "Daily or monthly request quota exhausted",
    retryable: false,
  },
  // EXTERNAL
  EXTERNAL_SERVICE_UNAVAILABLE_503: {
    description: "An external dependency is unavailable",
    retryable: true,
  },
  EXTERNAL_SERVICE_TIMEOUT_504: {
    description: "External service request timed out",
    retryable: true,
  },
  EXTERNAL_SERVICE_AUTH_FAILED_502: {
    description: "Authentication with external service failed",
    retryable: false,
  },
  EXTERNAL_SERVICE_RATE_LIMITED_429: {
    description: "External service has rate-limited this application",
    retryable: true,
  },
  EXTERNAL_SERVICE_INVALID_RESP_502: {
    description: "External service returned an unexpected response",
    retryable: true,
  },
  EXTERNAL_WEBHOOK_FAILED_500: {
    description: "Webhook delivery to external endpoint failed",
    retryable: true,
  },
  EXTERNAL_ORACLE_UNAVAILABLE_503: {
    description: "Price oracle is currently unavailable",
    retryable: true,
  },
};

/** In-memory registry of all defined error codes */
export class ErrorCodeRegistry {
  private static readonly entries: ErrorCodeEntry[] = (
    Object.values(ErrorCodes) as ErrorCode[]
  ).map((code) => ({
    code,
    category: extractCategory(code),
    httpStatus: extractHttpStatus(code),
    description: descriptions[code]?.description ?? code,
    retryable: descriptions[code]?.retryable ?? false,
  }));

  /** Returns all entries, optionally filtered and sorted by category then code */
  static getAll(category?: string): ErrorCodeEntry[] {
    const list = category
      ? this.entries.filter((e) => e.category === category.toUpperCase())
      : [...this.entries];

    return list.sort(
      (a, b) =>
        a.category.localeCompare(b.category) || a.code.localeCompare(b.code),
    );
  }

  /** Lookup a single entry by code */
  static find(code: ErrorCode): ErrorCodeEntry | undefined {
    return this.entries.find((e) => e.code === code);
  }

  /** All known categories */
  static categories(): string[] {
    return [...new Set(this.entries.map((e) => e.category))].sort();
  }
}
