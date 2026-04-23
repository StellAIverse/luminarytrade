//! # Cross-Chain Bridge Contract
//!
//! A secure cross-chain bridge implementation enabling asset transfers between
//! Stellar (Soroban) and EVM-compatible chains (Ethereum, Polygon, etc.).
//!
//! ## Features
//!
//! - **Cross-Chain Transfers**: Atomic deposit-mint and burn-withdraw flows
//! - **M-of-N Relayer Consensus**: Multiple relayers with threshold signatures
//! - **Security Controls**: Rate limiting, emergency pause, deposit limits
//! - **Liquidity Management**: Track and rebalance liquidity across chains
//! - **Fee System**: Configurable bridge fees and slippage
//! - **Monitoring**: Health checks, liquidity monitoring, activity tracking
//!
//! ## Architecture
//!
//! ### Bridge Flow
//!
//! 1. **Source Chain (Stellar)**: User deposits tokens
//! 2. **Relayers**: Watch events, sign attestations
//! 3. **Destination Chain (EVM)**: M-of-N signatures mint tokens
//!
//! ### Security Model
//!
//! - No single relayer can forge transfers
//! - Require M-of-N relayer signatures for validation
//! - Rate limiting prevents bridge spam
//! - Emergency pause if compromised
//! - Liquidity tracking prevents insolvency

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token,
    Address, Bytes, Env, Map, Symbol, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum BridgeError {
    InvalidFormat = 1001,
    InvalidLength = 1004,
    NotAuthorized = 1101,
    NotInitialized = 1109,
    AlreadyInitialized = 1110,
    KeyNotFound = 1201,
    OutOfRange = 1003,
}

// ============================================================================
// Storage Keys
// ============================================================================

#[contracttype]
pub enum DataKey {
    // Configuration
    Admin,
    Initialized,
    BridgeConfig,
    
    // Relayer Management
    RelayerSet,
    RelayerCount,
    Relayer(Address),
    RelayerNonce(Address),
    Threshold,
    
    // Transfer Tracking
    Transfer(u64),
    TransferNonce,
    BurnedTokens(Address), // token contract
    MintedTokens(Address), // token contract
    // Prevent double counting attestations per relayer
    Attested(u64, Address),
    WithdrawalRecipient(u64),
    
    // Liquidity Management
    LiquidityPool(Address), // token contract
    TotalLiquidity(Address),
    LockedLiquidity(Address),
    
    // Rate Limiting
    RateLimitConfig(Address),
    RateLimitUsed(Address, u64),
    DailyLimit(Address),
    
    // Security
    Paused,
    PauseReason,
    EmergencyCommittee,
    
    // Fees
    BridgeFeeBps,
    ProtocolFeeBps,
    SlippageToleranceBps,
    FeeRecipient,
    // Dynamic fee config
    FeeOracle, // Address authorized to report congestion
    DynamicFeeEnabled,
    CongestionThresholdBps,
    MaxExtraFeeBps,
    DynamicBridgeFeeBps,
    
    // Monitoring
    LastTransferTime,
    TotalVolume(Address),
    HealthCheckTimestamp,
}

// ============================================================================
// Data Types
// ============================================================================

/// Supported chain types
#[derive(Clone, Copy, PartialEq, Eq)]
#[contracttype]
pub enum ChainType {
    /// Stellar (Soroban)
    Stellar = 0,
    /// Ethereum
    Ethereum = 1,
    /// Polygon
    Polygon = 2,
    /// Binance Smart Chain
    BSC = 3,
    /// Arbitrum
    Arbitrum = 4,
    /// Optimism
    Optimism = 5,
    /// Generic EVM chain
    EVM = 99,
}

/// Transfer status
#[derive(Clone, Copy, PartialEq, Eq)]
#[contracttype]
pub enum TransferStatus {
    /// Pending relay confirmation
    Pending = 0,
    /// Confirmed by relayers
    Confirmed = 1,
    /// Completed (minted/burned)
    Completed = 2,
    /// Failed/cancelled
    Failed = 3,
}

/// Cross-chain transfer request
#[derive(Clone)]
#[contracttype]
pub struct BridgeTransfer {
    /// Unique transfer ID
    pub transfer_id: u64,
    /// Source chain
    pub source_chain: ChainType,
    /// Destination chain
    pub dest_chain: ChainType,
    /// Sender address (on source chain)
    pub sender: Address,
    /// Recipient address (on destination chain, as bytes for EVM compatibility)
    pub recipient: Bytes,
    /// Token contract address (Soroban token interface)
    pub token: Address,
    /// Amount to transfer
    pub amount: i128,
    /// Fee amount
    pub fee: i128,
    /// Net amount (after fee)
    pub net_amount: i128,
    /// Current status
    pub status: TransferStatus,
    /// Timestamp created
    pub created_at: u64,
    /// Confirmation count
    pub confirmations: u32,
    /// Required confirmations
    pub required_confirmations: u32,
}

/// Relayer attestation signature
#[derive(Clone)]
#[contracttype]
pub struct RelayerAttestation {
    /// Transfer ID being attested
    pub transfer_id: u64,
    /// Relayer address
    pub relayer: Address,
    /// Signature bytes (ECDSA or Ed25519)
    pub signature: Bytes,
    /// Timestamp
    pub timestamp: u64,
}

/// Relayer information
#[derive(Clone)]
#[contracttype]
pub struct RelayerInfo {
    /// Relayer address
    pub address: Address,
    /// Stake amount (if bonded)
    pub stake: i128,
    /// Added timestamp
    pub added_at: u64,
    /// Active status
    pub active: bool,
    /// Successful relays count
    pub successful_relays: u32,
    /// Failed relays count
    pub failed_relays: u32,
}

/// Bridge configuration
#[derive(Clone)]
#[contracttype]
pub struct BridgeConfig {
    /// Minimum relayer confirmations
    pub min_confirmations: u32,
    /// Total relayers
    pub total_relayers: u32,
    /// Transfer timeout (seconds)
    pub transfer_timeout: u64,
    /// Enable rate limiting
    pub rate_limit_enabled: bool,
    /// Daily limit per token
    pub daily_limit_per_token: i128,
    /// Max single transfer
    pub max_transfer_amount: i128,
    /// Min single transfer
    pub min_transfer_amount: i128,
}

/// Liquidity pool information
#[derive(Clone)]
#[contracttype]
pub struct LiquidityPool {
    /// Token contract
    pub token: Address,
    /// Total liquidity on this chain
    pub total_liquidity: i128,
    /// Available liquidity
    pub available: i128,
    /// Locked in transfers
    pub locked: i128,
    /// Target allocation
    pub target_allocation: i128,
}

/// Rate limit configuration
#[derive(Clone)]
#[contracttype]
pub struct RateLimitConfig {
    /// Daily limit
    pub daily_limit: i128,
    /// Single transaction limit
    pub tx_limit: i128,
    /// Window start timestamp
    pub window_start: u64,
    /// Used amount in current window
    pub used: i128,
}

/// Fee configuration
#[derive(Clone)]
#[contracttype]
pub struct FeeConfig {
    /// Bridge fee in basis points (e.g., 30 = 0.3%)
    pub bridge_fee_bps: u32,
    /// Protocol fee in basis points
    pub protocol_fee_bps: u32,
    /// Slippage tolerance in basis points
    pub slippage_tolerance_bps: u32,
    /// Fee recipient address
    pub fee_recipient: Address,
}

/// Bridge statistics for monitoring
#[derive(Clone)]
#[contracttype]
pub struct BridgeStats {
    /// Total transfers processed
    pub total_transfers: u32,
    /// Total volume bridged
    pub total_volume: Map<Address, i128>,
    /// Active relayers count
    pub active_relayers: u32,
    /// Is bridge paused
    pub is_paused: bool,
    /// Last health check timestamp
    pub last_health_check: u64,
    /// Current rate limit usage
    pub rate_limit_usage: Map<Address, i128>,
}

/// Event data for cross-chain transfer
#[derive(Clone)]
#[contracttype]
pub struct BridgeEvent {
    /// Event type
    pub event_type: Symbol,
    /// Transfer ID
    pub transfer_id: u64,
    /// Source chain
    pub source_chain: ChainType,
    /// Destination chain
    pub dest_chain: ChainType,
    /// Amount
    pub amount: i128,
    /// Sender
    pub sender: Address,
    /// Recipient
    pub recipient: Bytes,
}

// ============================================================================
// Constants
// ============================================================================

const SECONDS_PER_DAY: u64 = 86400;
const DEFAULT_TRANSFER_TIMEOUT: u64 = 3600; // 1 hour
const DEFAULT_BRIDGE_FEE_BPS: u32 = 30; // 0.3%
const DEFAULT_PROTOCOL_FEE_BPS: u32 = 10; // 0.1%
const DEFAULT_SLIPPAGE_BPS: u32 = 50; // 0.5%

// ============================================================================
// Contract
// ============================================================================

#[contract]
pub struct BridgeContract;

// ============================================================================
// Implementation
// ============================================================================

#[contractimpl]
impl BridgeContract {
    /// Initialize the bridge contract
    /// 
    /// # Arguments
    /// 
    /// * `env` - Soroban environment
    /// * `admin` - Admin address
    /// * `initial_relayers` - Initial set of relayer addresses
    /// * `min_confirmations` - Minimum confirmations required (M-of-N)
    /// 
    /// # Returns
    /// 
    /// * `Ok(())` - Initialization successful
    /// * `Err(BridgeError)` - If already initialized
    pub fn initialize(
        env: Env,
        admin: Address,
        initial_relayers: Vec<Address>,
        min_confirmations: u32,
    ) -> Result<(), BridgeError> {
        // Check if already initialized
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(BridgeError::AlreadyInitialized);
        }
        
        // Validate relayers
        if initial_relayers.len() < min_confirmations {
            return Err(BridgeError::InvalidLength);
        }
        
        // Store admin
        env.storage().instance().set(&DataKey::Admin, &admin);
        
        // Initialize relayers
        let mut relayer_count = 0u32;
        for relayer in initial_relayers.iter() {
            let relayer_info = RelayerInfo {
                address: relayer.clone(),
                stake: 0,
                added_at: env.ledger().timestamp(),
                active: true,
                successful_relays: 0,
                failed_relays: 0,
            };
            env.storage().persistent().set(&DataKey::Relayer(relayer.clone()), &relayer_info);
            relayer_count += 1;
        }
        
        env.storage().instance().set(&DataKey::RelayerCount, &relayer_count);
        env.storage().instance().set(&DataKey::Threshold, &min_confirmations);
        
        // Initialize bridge config
        let config = BridgeConfig {
            min_confirmations,
            total_relayers: relayer_count,
            transfer_timeout: DEFAULT_TRANSFER_TIMEOUT,
            rate_limit_enabled: true,
            daily_limit_per_token: 1_000_000_000_000, // 1M tokens default
            max_transfer_amount: 100_000_000_000, // 100K max per transfer
            min_transfer_amount: 1_000_000, // 1 token min
        };
        env.storage().instance().set(&DataKey::BridgeConfig, &config);
        
        // Initialize fees
        let fee_config = FeeConfig {
            bridge_fee_bps: DEFAULT_BRIDGE_FEE_BPS,
            protocol_fee_bps: DEFAULT_PROTOCOL_FEE_BPS,
            slippage_tolerance_bps: DEFAULT_SLIPPAGE_BPS,
            fee_recipient: admin.clone(),
        };
        env.storage().instance().set(&DataKey::BridgeFeeBps, &fee_config.bridge_fee_bps);
        env.storage().instance().set(&DataKey::ProtocolFeeBps, &fee_config.protocol_fee_bps);
        env.storage().instance().set(&DataKey::SlippageToleranceBps, &fee_config.slippage_tolerance_bps);
        env.storage().instance().set(&DataKey::FeeRecipient, &fee_config.fee_recipient);
        // Initialize dynamic fee defaults (disabled by default)
        env.storage().instance().set(&DataKey::DynamicFeeEnabled, &false);
        env.storage().instance().set(&DataKey::CongestionThresholdBps, &7000u32);
        env.storage().instance().set(&DataKey::MaxExtraFeeBps, &200u32);
        env.storage().instance().set(&DataKey::DynamicBridgeFeeBps, &fee_config.bridge_fee_bps);
        
        // Initialize transfer nonce
        env.storage().instance().set(&DataKey::TransferNonce, &0u64);
        
        // Mark as initialized (not paused by default)
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().instance().set(&DataKey::Initialized, &true);
        
        // Emit initialization event
        env.events().publish(
            (Symbol::new(&env, "bridge_init"), admin),
            (relayer_count, min_confirmations),
        );
        
        Ok(())
    }

    /// Initiate cross-chain transfer (deposit on source chain)
    /// 
    /// # Arguments
    /// 
    /// * `env` - Soroban environment
    /// * `sender` - User initiating transfer
    /// * `recipient` - Recipient address on destination chain (as bytes for EVM)
    /// * `dest_chain` - Destination chain type
    /// * `token` - Token type to bridge
    /// * `amount` - Amount to transfer
    /// 
    /// # Returns
    /// 
    /// * `Ok(BridgeTransfer)` - Created transfer request
    /// * `Err(BridgeError)` - If validation fails or paused
    pub fn initiate_transfer(
        env: Env,
        sender: Address,
        recipient: Bytes,
        dest_chain: ChainType,
        token_id: Address,
        amount: i128,
    ) -> Result<BridgeTransfer, BridgeError> {
        // Verify sender authorization
        sender.require_auth();
        
        // Check if bridge is paused
        let paused: bool = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
        if paused {
            return Err(BridgeError::NotAuthorized);
        }
        
        // Validate amount
        let config: BridgeConfig = env.storage().instance().get(&DataKey::BridgeConfig).unwrap();
        if amount < config.min_transfer_amount {
            return Err(BridgeError::OutOfRange);
        }
        if amount > config.max_transfer_amount {
            return Err(BridgeError::OutOfRange);
        }
        
        // Check rate limit
        if config.rate_limit_enabled {
            Self::check_rate_limit(&env, token_id.clone(), amount)?;
        }
        
        // Calculate fees
        let (fee, net_amount) = Self::calculate_fees(&env, amount)?;
        
        // Generate unique transfer ID
        let mut nonce: u64 = env.storage().instance().get(&DataKey::TransferNonce).unwrap();
        nonce += 1;
        env.storage().instance().set(&DataKey::TransferNonce, &nonce);
        
        // Create transfer record
        let transfer = BridgeTransfer {
            transfer_id: nonce,
            source_chain: ChainType::Stellar,
            dest_chain,
            sender: sender.clone(),
            recipient: recipient.clone(),
            token: token_id.clone(),
            amount,
            fee,
            net_amount,
            status: TransferStatus::Pending,
            created_at: env.ledger().timestamp(),
            confirmations: 0,
            required_confirmations: config.min_confirmations,
        };
        
        // Store transfer
        env.storage().persistent().set(&DataKey::Transfer(nonce), &transfer);
        
        // Lock the sender's tokens in this contract (secure locking).
        let token_client = token::Client::new(&env, &token_id);
        token_client.transfer(&sender, &env.current_contract_address(), &amount);

        // Track liquidity locked for this token.
        Self::lock_liquidity(&env, token_id.clone(), amount)?;
        
        // Update rate limit
        if config.rate_limit_enabled {
            Self::update_rate_limit(&env, token_id.clone(), amount)?;
        }
        
        // Emit event
        env.events().publish(
            (Symbol::new(&env, "bridge_req"), sender.clone()),
            (nonce, dest_chain as u32, amount),
        );
        
        Ok(transfer)
    }

    /// Relay attestation from relayer (confirm transfer)
    /// 
    /// # Arguments
    /// 
    /// * `env` - Soroban environment
    /// * `relayer` - Relayer address
    /// * `transfer_id` - Transfer ID to attest
    /// * `signature` - Relayer's signature
    /// 
    /// # Returns
    /// 
    /// * `Ok(bool)` - True if confirmation succeeded
    /// * `Err(BridgeError)` - If invalid relayer or transfer
    pub fn relay_attestation(
        env: Env,
        relayer: Address,
        transfer_id: u64,
        _signature: Bytes,
    ) -> Result<bool, BridgeError> {
        // Verify relayer authorization
        relayer.require_auth();
        
        // Verify relayer is active
        let relayer_info: RelayerInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Relayer(relayer.clone()))
            .ok_or(BridgeError::NotAuthorized)?;
        
        if !relayer_info.active {
            return Err(BridgeError::NotAuthorized);
        }

        // Prevent duplicate attestations by the same relayer for the same transfer.
        if env
            .storage()
            .persistent()
            .has(&DataKey::Attested(transfer_id, relayer.clone()))
        {
            return Err(BridgeError::AlreadyInitialized);
        }
        
        // Get transfer
        let mut transfer: BridgeTransfer = env
            .storage()
            .persistent()
            .get(&DataKey::Transfer(transfer_id))
            .ok_or(BridgeError::KeyNotFound)?;
        
        // Check transfer not already completed
        if transfer.status == TransferStatus::Completed {
            return Err(BridgeError::AlreadyInitialized);
        }
        
        // Check timeout
        let config: BridgeConfig = env.storage().instance().get(&DataKey::BridgeConfig).unwrap();
        if env.ledger().timestamp() > transfer.created_at + config.transfer_timeout {
            transfer.status = TransferStatus::Failed;
            env.storage().persistent().set(&DataKey::Transfer(transfer_id), &transfer);
            return Err(BridgeError::OutOfRange); // Timeout
        }
        
        // Increment confirmations
        transfer.confirmations += 1;
        
        // Check if reached threshold
        if transfer.confirmations >= transfer.required_confirmations {
            transfer.status = TransferStatus::Confirmed;
        }
        
        // Store updated transfer
        env.storage().persistent().set(&DataKey::Transfer(transfer_id), &transfer);

        // Mark attestation used.
        env.storage()
            .persistent()
            .set(&DataKey::Attested(transfer_id, relayer.clone()), &true);
        
        // Update relayer stats
        let mut updated_relayer = relayer_info;
        updated_relayer.successful_relays += 1;
        env.storage().persistent().set(&DataKey::Relayer(relayer.clone()), &updated_relayer);
        
        // Emit attestation event
        env.events().publish(
            (Symbol::new(&env, "relay_att"), relayer.clone()),
            (transfer_id, transfer.confirmations),
        );
        
        Ok(true)
    }

    /// Complete transfer on destination chain (mint tokens)
    /// 
    /// # Arguments
    /// 
    /// * `env` - Soroban environment
    /// * `transfer_id` - Transfer ID to complete
    /// 
    /// # Returns
    /// 
    /// * `Ok(())` - Transfer completed
    /// * `Err(BridgeError)` - If not confirmed or invalid
    pub fn complete_transfer(env: Env, transfer_id: u64) -> Result<(), BridgeError> {
        // Get transfer
        let mut transfer: BridgeTransfer = env
            .storage()
            .persistent()
            .get(&DataKey::Transfer(transfer_id))
            .ok_or(BridgeError::KeyNotFound)?;
        
        // Check if confirmed
        if transfer.status != TransferStatus::Confirmed {
            return Err(BridgeError::NotAuthorized);
        }
        
        // Mint tokens on destination (mock - in production would use token contract)
        // For now, we just track that tokens were minted
        let mut minted: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::MintedTokens(transfer.token.clone()))
            .unwrap_or(0);
        minted += transfer.net_amount;
        env.storage().persistent().set(&DataKey::MintedTokens(transfer.token.clone()), &minted);
        
        // Update transfer status
        transfer.status = TransferStatus::Completed;
        env.storage().persistent().set(&DataKey::Transfer(transfer_id), &transfer);
        
        // Distribute fees (paid out of the locked amount).
        Self::distribute_fees(&env, transfer.token.clone(), transfer.fee)?;
        Self::unlock_liquidity(&env, transfer.token.clone(), transfer.fee)?;
        
        // Emit completion event
        env.events().publish(
            (Symbol::new(&env, "bridge_cmp"), transfer.sender.clone()),
            (transfer_id, transfer.net_amount),
        );
        
        Ok(())
    }

    /// Burn tokens on destination chain to withdraw on source
    /// 
    /// # Arguments
    /// 
    /// * `env` - Soroban environment
    /// * `burner` - Address burning tokens
    /// * `recipient` - Recipient on source chain
    /// * `source_chain` - Source chain (where tokens will be released)
    /// * `token` - Token type
    /// * `amount` - Amount to burn
    /// 
    /// # Returns
    /// 
    /// * `Ok(BridgeTransfer)` - New transfer request for withdrawal
    /// * `Err(BridgeError)` - If burn fails
    pub fn burn_and_withdraw(
        env: Env,
        burner: Address,
        recipient: Address,
        source_chain: ChainType,
        token_id: Address,
        amount: i128,
    ) -> Result<BridgeTransfer, BridgeError> {
        burner.require_auth();
        
        // Check if bridge is paused
        let paused: bool = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
        if paused {
            return Err(BridgeError::NotAuthorized);
        }
        
        // Validate amount
        let config: BridgeConfig = env.storage().instance().get(&DataKey::BridgeConfig).unwrap();
        if amount < config.min_transfer_amount || amount > config.max_transfer_amount {
            return Err(BridgeError::OutOfRange);
        }
        
        // Verify burned tokens exist (mock check)
        let minted: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::MintedTokens(token_id.clone()))
            .unwrap_or(0);
        
        if minted < amount {
            return Err(BridgeError::OutOfRange); // Insufficient burned tokens
        }
        
        // Calculate fees
        let (fee, net_amount) = Self::calculate_fees(&env, amount)?;
        
        // Generate transfer ID
        let mut nonce: u64 = env.storage().instance().get(&DataKey::TransferNonce).unwrap();
        nonce += 1;
        env.storage().instance().set(&DataKey::TransferNonce, &nonce);
        
        // Create burn transfer record
        let transfer = BridgeTransfer {
            transfer_id: nonce,
            source_chain: ChainType::EVM, // Assuming burn happens on EVM
            dest_chain: source_chain,
            sender: burner.clone(),
            recipient: Bytes::from_slice(&env, &[0u8; 0]),
            token: token_id.clone(),
            amount,
            fee,
            net_amount,
            status: TransferStatus::Pending,
            created_at: env.ledger().timestamp(),
            confirmations: 0,
            required_confirmations: config.min_confirmations,
        };
        
        // Store transfer
        env.storage().persistent().set(&DataKey::Transfer(nonce), &transfer);

        // Store the real Soroban recipient for completion.
        env.storage()
            .persistent()
            .set(&DataKey::WithdrawalRecipient(nonce), &recipient);
        
        // Track burned tokens
        let mut burned: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::BurnedTokens(token_id.clone()))
            .unwrap_or(0);
        burned += amount;
        env.storage().persistent().set(&DataKey::BurnedTokens(token_id.clone()), &burned);
        
        // Emit event
        env.events().publish(
            (Symbol::new(&env, "bridge_burn"), burner.clone()),
            (nonce, amount),
        );
        
        Ok(transfer)
    }

    /// Refund a pending transfer after timeout, returning locked funds to the sender.
    pub fn refund_transfer(env: Env, sender: Address, transfer_id: u64) -> Result<(), BridgeError> {
        sender.require_auth();

        let mut transfer: BridgeTransfer = env
            .storage()
            .persistent()
            .get(&DataKey::Transfer(transfer_id))
            .ok_or(BridgeError::KeyNotFound)?;

        if transfer.sender != sender {
            return Err(BridgeError::NotAuthorized);
        }

        if transfer.status == TransferStatus::Completed {
            return Err(BridgeError::AlreadyInitialized);
        }

        let config: BridgeConfig = env.storage().instance().get(&DataKey::BridgeConfig).unwrap();
        let now = env.ledger().timestamp();
        if now <= transfer.created_at + config.transfer_timeout {
            return Err(BridgeError::OutOfRange); // Not timed out yet
        }

        // Return locked funds.
        let token_client = token::Client::new(&env, &transfer.token);
        token_client.transfer(&env.current_contract_address(), &sender, &transfer.amount);
        Self::unlock_liquidity(&env, transfer.token.clone(), transfer.amount)?;

        transfer.status = TransferStatus::Failed;
        env.storage().persistent().set(&DataKey::Transfer(transfer_id), &transfer);

        env.events().publish(
            (Symbol::new(&env, "bridge_ref"), sender),
            transfer_id,
        );

        Ok(())
    }

    /// Complete a burn+withdraw transfer on Stellar by releasing locked funds to the recipient.
    pub fn complete_withdraw(env: Env, transfer_id: u64) -> Result<(), BridgeError> {
        let mut transfer: BridgeTransfer = env
            .storage()
            .persistent()
            .get(&DataKey::Transfer(transfer_id))
            .ok_or(BridgeError::KeyNotFound)?;

        if transfer.status != TransferStatus::Confirmed {
            return Err(BridgeError::NotAuthorized);
        }

        let recipient: Address = env
            .storage()
            .persistent()
            .get(&DataKey::WithdrawalRecipient(transfer_id))
            .ok_or(BridgeError::KeyNotFound)?;

        // Pay fee, then release net amount.
        if transfer.fee > 0 {
            Self::distribute_fees(&env, transfer.token.clone(), transfer.fee)?;
            Self::unlock_liquidity(&env, transfer.token.clone(), transfer.fee)?;
        }
        let token_client = token::Client::new(&env, &transfer.token);
        token_client.transfer(&env.current_contract_address(), &recipient, &transfer.net_amount);
        Self::unlock_liquidity(&env, transfer.token.clone(), transfer.net_amount)?;

        transfer.status = TransferStatus::Completed;
        env.storage().persistent().set(&DataKey::Transfer(transfer_id), &transfer);

        env.events().publish(
            (Symbol::new(&env, "bridge_wd"), recipient),
            (transfer_id, transfer.net_amount),
        );

        Ok(())
    }

    /// Add new relayer (admin only)
    /// 
    /// # Arguments
    /// 
    /// * `env` - Soroban environment
    /// * `admin` - Admin address
    /// * `relayer` - New relayer address
    pub fn add_relayer(env: Env, admin: Address, relayer: Address) -> Result<(), BridgeError> {
        Self::require_admin(&env, &admin)?;
        
        // Check if already a relayer
        if env.storage().persistent().has(&DataKey::Relayer(relayer.clone())) {
            return Err(BridgeError::AlreadyInitialized);
        }
        
        // Add relayer
        let relayer_info = RelayerInfo {
            address: relayer.clone(),
            stake: 0,
            added_at: env.ledger().timestamp(),
            active: true,
            successful_relays: 0,
            failed_relays: 0,
        };
        env.storage().persistent().set(&DataKey::Relayer(relayer.clone()), &relayer_info);
        
        // Update count
        let mut count: u32 = env.storage().instance().get(&DataKey::RelayerCount).unwrap();
        count += 1;
        env.storage().instance().set(&DataKey::RelayerCount, &count);
        
        env.events().publish(
            (Symbol::new(&env, "relayer_add"), admin),
            relayer,
        );
        
        Ok(())
    }

    /// Remove relayer (admin only)
    /// 
    /// # Arguments
    /// 
    /// * `env` - Soroban environment
    /// * `admin` - Admin address
    /// * `relayer` - Relayer to remove
    pub fn remove_relayer(env: Env, admin: Address, relayer: Address) -> Result<(), BridgeError> {
        Self::require_admin(&env, &admin)?;
        
        // Set inactive
        let mut relayer_info: RelayerInfo = env
            .storage()
            .persistent()
            .get(&DataKey::Relayer(relayer.clone()))
            .ok_or(BridgeError::KeyNotFound)?;
        
        relayer_info.active = false;
        env.storage().persistent().set(&DataKey::Relayer(relayer.clone()), &relayer_info);
        
        env.events().publish(
            (Symbol::new(&env, "relayer_rem"), admin),
            relayer,
        );
        
        Ok(())
    }

    /// Emergency pause (admin only)
    pub fn pause(env: Env, admin: Address, reason: Symbol) -> Result<(), BridgeError> {
        Self::require_admin(&env, &admin)?;
        
        env.storage().instance().set(&DataKey::Paused, &true);
        env.storage().instance().set(&DataKey::PauseReason, &reason);
        
        env.events().publish(
            (Symbol::new(&env, "bridge_pause"), admin),
            reason,
        );
        
        Ok(())
    }

    /// Unpause bridge (admin only)
    pub fn unpause(env: Env, admin: Address) -> Result<(), BridgeError> {
        Self::require_admin(&env, &admin)?;
        
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().instance().remove(&DataKey::PauseReason);
        
        env.events().publish(
            (Symbol::new(&env, "bridge_unpa"), admin),
            Symbol::new(&env, "resumed"),
        );
        
        Ok(())
    }

    /// Update bridge configuration (admin only)
    pub fn update_config(
        env: Env,
        admin: Address,
        config: BridgeConfig,
    ) -> Result<(), BridgeError> {
        Self::require_admin(&env, &admin)?;
        env.storage().instance().set(&DataKey::BridgeConfig, &config);
        
        env.events().publish(
            (Symbol::new(&env, "cfg_upd"), admin),
            Symbol::new(&env, "updated"),
        );
        
        Ok(())
    }

    /// Update fee configuration (admin only)
    pub fn update_fees(
        env: Env,
        admin: Address,
        bridge_fee_bps: u32,
        protocol_fee_bps: u32,
        slippage_bps: u32,
    ) -> Result<(), BridgeError> {
        Self::require_admin(&env, &admin)?;
        
        // Validate basis points (max 10000 = 100%)
        if bridge_fee_bps > 10000 || protocol_fee_bps > 10000 || slippage_bps > 10000 {
            return Err(BridgeError::OutOfRange);
        }
        
        env.storage().instance().set(&DataKey::BridgeFeeBps, &bridge_fee_bps);
        env.storage().instance().set(&DataKey::ProtocolFeeBps, &protocol_fee_bps);
        env.storage().instance().set(&DataKey::SlippageToleranceBps, &slippage_bps);
        
        env.events().publish(
            (Symbol::new(&env, "fee_upd"), admin),
            (bridge_fee_bps, protocol_fee_bps),
        );
        
        Ok(())
    }

    /// Set the oracle address authorized to report congestion metrics
    pub fn set_fee_oracle(env: Env, admin: Address, oracle: Address) -> Result<(), BridgeError> {
        Self::require_admin(&env, &admin)?;
        env.storage().instance().set(&DataKey::FeeOracle, &oracle);
        env.events().publish((Symbol::new(&env, "fee_oracle_set"), admin), oracle);
        Ok(())
    }

    /// Enable or disable dynamic fees (admin only)
    pub fn set_dynamic_fee_enabled(env: Env, admin: Address, enabled: bool) -> Result<(), BridgeError> {
        Self::require_admin(&env, &admin)?;
        env.storage().instance().set(&DataKey::DynamicFeeEnabled, &enabled);
        env.events().publish((Symbol::new(&env, "dynamic_fee_toggled"), admin), enabled);
        Ok(())
    }

    /// Set dynamic fee parameters (admin only)
    pub fn set_dynamic_fee_params(env: Env, admin: Address, congestion_threshold_bps: u32, max_extra_fee_bps: u32) -> Result<(), BridgeError> {
        Self::require_admin(&env, &admin)?;
        if congestion_threshold_bps >= 10000 || max_extra_fee_bps > 10000 {
            return Err(BridgeError::OutOfRange);
        }
        env.storage().instance().set(&DataKey::CongestionThresholdBps, &congestion_threshold_bps);
        env.storage().instance().set(&DataKey::MaxExtraFeeBps, &max_extra_fee_bps);
        env.events().publish((Symbol::new(&env, "dynamic_fee_params"), admin), (congestion_threshold_bps, max_extra_fee_bps));
        Ok(())
    }

    /// Oracle-only entrypoint: report current congestion (in basis points, 0..10000)
    /// The oracle address must be set via `set_fee_oracle` and must `require_auth()`.
    pub fn report_congestion(env: Env, oracle: Address, congestion_bps: u32) -> Result<(), BridgeError> {
        // oracle must sign the call
        oracle.require_auth();

        // check registered oracle
        let registered: Address = env.storage().instance().get(&DataKey::FeeOracle).unwrap();
        if registered != oracle {
            return Err(BridgeError::NotAuthorized);
        }

        if congestion_bps > 10000 {
            return Err(BridgeError::OutOfRange);
        }

        // Compute extra fee and update dynamic fee bps
        let base_bps: u32 = env.storage().instance().get(&DataKey::BridgeFeeBps).unwrap();
        let threshold: u32 = env.storage().instance().get(&DataKey::CongestionThresholdBps).unwrap_or(7000u32);
        let max_extra: u32 = env.storage().instance().get(&DataKey::MaxExtraFeeBps).unwrap_or(200u32);

        let extra_bps: u32 = if congestion_bps <= threshold {
            0
        } else {
            // scale extra proportionally between threshold..10000
            let num: u128 = (congestion_bps - threshold) as u128;
            let den: u128 = (10000 - threshold) as u128;
            (((num * max_extra as u128) + (den / 2)) / den) as u32
        };

        let dynamic_bps = base_bps.saturating_add(extra_bps);
        env.storage().instance().set(&DataKey::DynamicBridgeFeeBps, &dynamic_bps);

        env.events().publish(
            (Symbol::new(&env, "dynamic_fee_update"), oracle),
            (congestion_bps, dynamic_bps),
        );

        Ok(())
    }

    /// Get bridge statistics for monitoring
    pub fn get_stats(env: Env) -> BridgeStats {
        let total_transfers: u64 = env.storage().instance().get(&DataKey::TransferNonce).unwrap_or(0);
        let relayer_count: u32 = env.storage().instance().get(&DataKey::RelayerCount).unwrap_or(0);
        let is_paused: bool = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
        let last_health: u64 = env.storage().instance().get(&DataKey::HealthCheckTimestamp).unwrap_or(0);
        
        BridgeStats {
            total_transfers: total_transfers as u32,
            total_volume: Map::new(&env), // Would aggregate from transfers
            active_relayers: relayer_count,
            is_paused,
            last_health_check: last_health,
            rate_limit_usage: Map::new(&env),
        }
    }

    /// Return the currently configured dynamic bridge fee BPS (if any).
    pub fn get_dynamic_bridge_fee(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::DynamicBridgeFeeBps)
            .unwrap_or(0u32)
    }

    /// Return the configured static bridge fee BPS.
    pub fn get_bridge_fee_bps(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::BridgeFeeBps).unwrap_or(0u32)
    }

    /// Get transfer by ID
    pub fn get_transfer(env: Env, transfer_id: u64) -> Result<BridgeTransfer, BridgeError> {
        env.storage()
            .persistent()
            .get(&DataKey::Transfer(transfer_id))
            .ok_or(BridgeError::KeyNotFound)
    }

    /// Get relayer info
    pub fn get_relayer_info(env: Env, relayer: Address) -> Result<RelayerInfo, BridgeError> {
        env.storage()
            .persistent()
            .get(&DataKey::Relayer(relayer))
            .ok_or(BridgeError::KeyNotFound)
    }

    /// Get liquidity pool info
    pub fn get_liquidity_pool(env: Env, token_id: Address) -> Result<LiquidityPool, BridgeError> {
        env.storage()
            .persistent()
            .get(&DataKey::LiquidityPool(token_id))
            .ok_or(BridgeError::KeyNotFound)
    }

    /// Health check function for monitoring
    pub fn health_check(env: Env) -> bool {
        // Update health check timestamp
        env.storage().instance().set(&DataKey::HealthCheckTimestamp, &env.ledger().timestamp());
        
        // Basic health checks
        let paused: bool = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
        if paused {
            return false;
        }
        
        // Check relayers are responding (would need more sophisticated check in production)
        let relayer_count: u32 = env.storage().instance().get(&DataKey::RelayerCount).unwrap_or(0);
        relayer_count > 0
    }

    // ========================================================================
    // Internal Helper Functions
    // ========================================================================

    /// Calculate fees for a transfer. If dynamic fees are enabled, use the
    /// latest computed dynamic bridge fee BPS; otherwise use the static value.
    fn calculate_fees(env: &Env, amount: i128) -> Result<(i128, i128), BridgeError> {
        let dynamic_enabled: bool = env.storage().instance().get(&DataKey::DynamicFeeEnabled).unwrap_or(false);

        let bridge_fee_bps: u32 = if dynamic_enabled {
            env.storage().instance().get(&DataKey::DynamicBridgeFeeBps).unwrap_or(env.storage().instance().get(&DataKey::BridgeFeeBps).unwrap())
        } else {
            env.storage().instance().get(&DataKey::BridgeFeeBps).unwrap()
        };

        let protocol_fee_bps: u32 = env.storage().instance().get(&DataKey::ProtocolFeeBps).unwrap();

        let bridge_fee = (amount * bridge_fee_bps as i128) / 10000;
        let protocol_fee = (amount * protocol_fee_bps as i128) / 10000;
        let total_fee = bridge_fee + protocol_fee;
        let net_amount = amount - total_fee;

        Ok((total_fee, net_amount))
    }

    /// Distribute collected fees
    fn distribute_fees(env: &Env, token_id: Address, fee: i128) -> Result<(), BridgeError> {
        let fee_recipient: Address = env.storage().instance().get(&DataKey::FeeRecipient).unwrap();

        if fee > 0 {
            let token_client = token::Client::new(env, &token_id);
            token_client.transfer(&env.current_contract_address(), &fee_recipient, &fee);
        }

        env.events().publish(
            (Symbol::new(env, "fee_dist"), fee_recipient),
            (token_id, fee),
        );
        
        Ok(())
    }

    /// Check rate limit for token
    fn check_rate_limit(env: &Env, token_id: Address, amount: i128) -> Result<(), BridgeError> {
        let config: BridgeConfig = env.storage().instance().get(&DataKey::BridgeConfig).unwrap();
        
        // Get daily limit
        let daily_limit = config.daily_limit_per_token;
        
        // Get current usage
        let current_time = env.ledger().timestamp();
        let day_start = (current_time / SECONDS_PER_DAY) * SECONDS_PER_DAY;
        
        let used: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::RateLimitUsed(token_id.clone(), day_start))
            .unwrap_or(0);
        
        // Check if would exceed limit
        if used + amount > daily_limit {
            return Err(BridgeError::OutOfRange);
        }
        
        Ok(())
    }

    /// Update rate limit usage
    fn update_rate_limit(env: &Env, token_id: Address, amount: i128) -> Result<(), BridgeError> {
        let current_time = env.ledger().timestamp();
        let day_start = (current_time / SECONDS_PER_DAY) * SECONDS_PER_DAY;
        
        let mut used: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::RateLimitUsed(token_id.clone(), day_start))
            .unwrap_or(0);
        
        used += amount;
        env.storage()
            .persistent()
            .set(&DataKey::RateLimitUsed(token_id, day_start), &used);
        
        Ok(())
    }

    /// Lock liquidity for transfer
    fn lock_liquidity(env: &Env, token_id: Address, amount: i128) -> Result<(), BridgeError> {
        // Get or create liquidity pool
        let mut pool: LiquidityPool = env
            .storage()
            .persistent()
            .get(&DataKey::LiquidityPool(token_id.clone()))
            .unwrap_or_else(|| LiquidityPool {
                token: token_id.clone(),
                total_liquidity: 0,
                available: 0,
                locked: 0,
                target_allocation: 0,
            });

        // Deposits add to total liquidity held by the bridge contract.
        pool.total_liquidity += amount;
        
        // Lock amount
        pool.locked += amount;
        pool.available = pool.total_liquidity - pool.locked;
        
        env.storage()
            .persistent()
            .set(&DataKey::LiquidityPool(token_id), &pool);
        
        Ok(())
    }

    fn unlock_liquidity(env: &Env, token_id: Address, amount: i128) -> Result<(), BridgeError> {
        let mut pool: LiquidityPool = env
            .storage()
            .persistent()
            .get(&DataKey::LiquidityPool(token_id.clone()))
            .unwrap_or_else(|| LiquidityPool {
                token: token_id.clone(),
                total_liquidity: 0,
                available: 0,
                locked: 0,
                target_allocation: 0,
            });

        if amount > pool.locked {
            return Err(BridgeError::OutOfRange);
        }
        pool.locked -= amount;
        pool.total_liquidity -= amount;
        pool.available = pool.total_liquidity - pool.locked;
        env.storage()
            .persistent()
            .set(&DataKey::LiquidityPool(token_id), &pool);
        Ok(())
    }

    /// Require admin authorization
    fn require_admin(env: &Env, admin: &Address) -> Result<(), BridgeError> {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(BridgeError::NotInitialized)?;
        
        if stored_admin != *admin {
            return Err(BridgeError::NotAuthorized);
        }
        
        admin.require_auth();
        Ok(())
    }
}
