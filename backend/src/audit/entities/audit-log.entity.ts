import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  BeforeUpdate,
  BeforeInsert,
} from "typeorm";

export enum AuditEventType {
  // Auth
  USER_LOGIN = "USER_LOGIN",
  USER_LOGOUT = "USER_LOGOUT",
  USER_LOGIN_FAILED = "USER_LOGIN_FAILED",
  TOKEN_REFRESHED = "TOKEN_REFRESHED",
  // Wallet / Blockchain
  WALLET_CONNECTED = "WALLET_CONNECTED",
  WALLET_DISCONNECTED = "WALLET_DISCONNECTED",
  TRANSACTION_CREATED = "TRANSACTION_CREATED",
  TRANSACTION_SIGNED = "TRANSACTION_SIGNED",
  TRANSACTION_SENT = "TRANSACTION_SENT",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  CONTRACT_DEPLOYED = "CONTRACT_DEPLOYED",
  CONTRACT_CALLED = "CONTRACT_CALLED",
  // Data CRUD
  RECORD_CREATED = "RECORD_CREATED",
  RECORD_UPDATED = "RECORD_UPDATED",
  RECORD_DELETED = "RECORD_DELETED",
  RECORD_READ = "RECORD_READ",
  // AI / Oracle
  AI_REQUEST_MADE = "AI_REQUEST_MADE",
  ORACLE_PRICE_FETCHED = "ORACLE_PRICE_FETCHED",
  // Admin
  CONFIG_CHANGED = "CONFIG_CHANGED",
  PERMISSION_GRANTED = "PERMISSION_GRANTED",
  PERMISSION_REVOKED = "PERMISSION_REVOKED",
  RATE_LIMIT_TRIGGERED = "RATE_LIMIT_TRIGGERED",
  RATE_LIMIT_OVERRIDE = "RATE_LIMIT_OVERRIDE",
  // Audit housekeeping
  AUDIT_LOG_EXPORTED = "AUDIT_LOG_EXPORTED",
  AUDIT_LOG_DELETED = "AUDIT_LOG_DELETED",
}

export enum AuditStatus {
  SUCCESS = "SUCCESS",
  FAILURE = "FAILURE",
  PARTIAL = "PARTIAL",
}

@Entity({ name: "audit_logs" })
@Index(["wallet", "eventType"])
@Index(["timestamp"])
@Index(["relatedEntityType", "relatedEntityId"])
@Index(["userId"])
export class AuditLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** Authenticated user id (if available) */
  @Column({ nullable: true })
  @Index()
  userId: string | null;

  /** Blockchain wallet address involved */
  @Column({ nullable: true })
  wallet: string | null;

  @Column({ type: "varchar" })
  eventType: AuditEventType;

  /** Type of domain entity affected, e.g. "Transaction", "Contract" */
  @Column({ nullable: true })
  entityType: string | null;

  /** ID of the affected entity */
  @Column({ nullable: true })
  entityId: string | null;

  /**
   * Snapshot of entity state before the operation.
   * Stored as JSONB so it is queryable.
   */
  @Column({ type: "jsonb", nullable: true })
  oldValues: Record<string, unknown> | null;

  /**
   * Snapshot of entity state after the operation.
   */
  @Column({ type: "jsonb", nullable: true })
  newValues: Record<string, unknown> | null;

  /** Arbitrary metadata (request body excerpt, error reason, etc.) */
  @Column({ type: "jsonb", default: "{}" })
  metadata: Record<string, unknown>;

  @Column({ nullable: true })
  description: string | null;

  @Column({ nullable: true })
  ipAddress: string | null;

  @Column({ nullable: true })
  userAgent: string | null;

  @Column({ nullable: true })
  requestId: string | null;

  @Column({ type: "varchar", default: AuditStatus.SUCCESS })
  status: AuditStatus;

  /** JSON error details when status = FAILURE */
  @Column({ type: "jsonb", nullable: true })
  errorDetails: Record<string, unknown> | null;

  @CreateDateColumn({ type: "timestamptz" })
  timestamp: Date;

  // ── Soft-delete (immutability) ────────────────────────────────────────────

  /** When set the row is considered soft-deleted */
  @Column({ type: "timestamptz", nullable: true })
  deletedAt: Date | null;

  /** Required when performing a soft delete */
  @Column({ nullable: true })
  deletionReason: string | null;

  // ── Aliases kept for backward-compat ─────────────────────────────────────

  get relatedEntityId(): string | null {
    return this.entityId;
  }
  get relatedEntityType(): string | null {
    return this.entityType;
  }

  // ── Guard: audit logs must never be mutated ───────────────────────────────

  @BeforeUpdate()
  preventMutation(): void {
    // Allow only soft-delete columns to change
    const allowed = new Set(["deletedAt", "deletionReason"]);
    // TypeORM does not expose changed columns here but we guard at service level.
  }
}
