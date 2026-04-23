//! # Affiliate Bonus Contract
//!
//! A referral and affiliate bonus system with on-chain commission tracking and transparent payouts.
//!
//! ## Features
//!
//! - **Referral Tracking**: On-chain tracking of referral relationships
//! - **Commission on Volume**: Percentage-based commissions on trading volume
//! - **Transparent Payouts**: All commissions and payouts visible on-chain
//! - **Multi-Level Referrals**: Support for multi-tier referral structures
//! - **Automated Distribution**: Automatic commission calculation and distribution
//!
//! ## Architecture
//!
//! ### Referral Flow
//!
//! 1. **Registration**: Affiliates register and get unique referral codes
//! 2. **Referral**: Users sign up using referral codes
//! 3. **Volume Tracking**: System tracks trading volume from referred users
//! 4. **Commission Calculation**: Automatic calculation based on volume and commission rate
//! 5. **Payout**: Commissions distributed to affiliates

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, panic_with_error,
    Address, Env, Map, Symbol, Vec, String, IntoVal, Val
};
use common_utils::error::CommonError;

// ============================================================================
// Storage Keys
// ============================================================================

#[contracttype]
pub enum DataKey {
    // Configuration
    Admin,
    Initialized,
    AffiliateConfig,
    
    // Affiliate Management
    AffiliateCount,
    Affiliate(Address),
    AffiliateCodeIndex(Symbol),
    
    // Referral Relationships
    ReferralCode(Address),
    ReferredBy(Address),
    ReferralTree(Address),
    
    // Volume & Commission Tracking
    UserVolume(Address),
    AffiliateCommission(Address),
    CommissionHistory(Address),
    TotalVolume,
    TotalCommissionPaid,
    
    // Payout Management
    PendingPayouts(Address),
    PayoutHistory(Address),
    PayoutCount,
    Payout(u64),
    
    // Events
    EventCount,
    Event(u64),
}

// ============================================================================
// Data Types
// ============================================================================

/// Affiliate status
#[derive(Clone, Copy, PartialEq, Eq)]
#[contracttype]
pub enum AffiliateStatus {
    /// Active and earning commissions
    Active = 0,
    /// Suspended
    Suspended = 1,
    /// Banned
    Banned = 2,
}

/// Affiliate information
#[derive(Clone)]
#[contracttype]
pub struct Affiliate {
    /// Affiliate address
    pub address: Address,
    /// Unique referral code
    pub referral_code: Symbol,
    /// Current status
    pub status: AffiliateStatus,
    /// Commission rate in basis points (e.g., 500 = 5%)
    pub commission_rate_bps: u32,
    /// Total referred users
    pub referred_count: u32,
    /// Total commission earned
    pub total_commission_earned: i128,
    /// Total commission withdrawn
    pub total_commission_withdrawn: i128,
    /// Registered timestamp
    pub registered_at: u64,
    /// Referral level (for multi-tier)
    pub level: u32,
}

/// Affiliate configuration
#[derive(Clone)]
#[contracttype]
pub struct AffiliateConfig {
    /// Default commission rate in basis points
    pub default_commission_rate_bps: u32,
    /// Maximum commission rate in basis points
    pub max_commission_rate_bps: u32,
    /// Minimum payout amount
    pub min_payout_amount: i128,
    /// Enable multi-level referrals
    pub multi_level_enabled: bool,
    /// Number of referral levels
    pub referral_levels: u32,
}

/// Commission record
#[derive(Clone)]
#[contracttype]
pub struct CommissionRecord {
    /// Record ID
    pub record_id: u64,
    /// Affiliate address
    pub affiliate: Address,
    /// Referred user address
    pub referred_user: Address,
    /// Volume amount
    pub volume: i128,
    /// Commission amount
    pub commission: i128,
    /// Commission rate applied
    pub commission_rate_bps: u32,
    /// Timestamp
    pub timestamp: u64,
}

/// Payout record
#[derive(Clone)]
#[contracttype]
pub struct PayoutRecord {
    /// Payout ID
    pub payout_id: u64,
    /// Affiliate address
    pub affiliate: Address,
    /// Payout amount
    pub amount: i128,
    /// Timestamp
    pub timestamp: u64,
    /// Transaction hash (if applicable)
    pub tx_hash: Option<Symbol>,
}

/// User volume tracking
#[derive(Clone)]
#[contracttype]
pub struct UserVolumeRecord {
    /// User address
    pub user: Address,
    /// Total trading volume
    pub total_volume: i128,
    /// Volume in current period
    pub period_volume: i128,
    /// Period start timestamp
    pub period_start: u64,
}

/// Event record
#[derive(Clone)]
#[contracttype]
pub struct EventRecord {
    /// Event ID
    pub event_id: u64,
    /// Event type
    pub event_type: Symbol,
    /// Data
    pub data: String,
    /// Timestamp
    pub timestamp: u64,
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_COMMISSION_RATE_BPS: u32 = 500; // 5%
const MAX_COMMISSION_RATE_BPS: u32 = 2000; // 20%
const MIN_PAYOUT_AMOUNT: i128 = 1_000_000; // 1 token
const DEFAULT_REFERRAL_LEVELS: u32 = 3;

// ============================================================================
// Contract
// ============================================================================

#[contract]
pub struct AffiliateBonusContract;

// ============================================================================
// Implementation
// ============================================================================

#[contractimpl]
impl AffiliateBonusContract {
    /// Initialize the affiliate contract
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `admin` - Admin address
    /// * `default_commission_rate_bps` - Default commission rate in basis points
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Initialization successful
    /// * `Err(CommonError)` - If already initialized
    pub fn initialize(
        env: Env,
        admin: Address,
        default_commission_rate_bps: u32,
    ) -> Result<(), CommonError> {
        // Check if already initialized
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(CommonError::AlreadyInitialized);
        }

        // Validate commission rate
        if default_commission_rate_bps > MAX_COMMISSION_RATE_BPS {
            return Err(CommonError::OutOfRange);
        }

        // Store admin
        env.storage().instance().set(&DataKey::Admin, &admin);

        // Initialize configuration
        let config = AffiliateConfig {
            default_commission_rate_bps: if default_commission_rate_bps > 0 { 
                default_commission_rate_bps 
            } else { 
                DEFAULT_COMMISSION_RATE_BPS 
            },
            max_commission_rate_bps: MAX_COMMISSION_RATE_BPS,
            min_payout_amount: MIN_PAYOUT_AMOUNT,
            multi_level_enabled: true,
            referral_levels: DEFAULT_REFERRAL_LEVELS,
        };
        env.storage().instance().set(&DataKey::AffiliateConfig, &config);

        // Initialize counters
        env.storage().instance().set(&DataKey::AffiliateCount, &0u64);
        env.storage().instance().set(&DataKey::PayoutCount, &0u64);
        env.storage().instance().set(&DataKey::EventCount, &0u64);
        env.storage().instance().set(&DataKey::TotalVolume, &0i128);
        env.storage().instance().set(&DataKey::TotalCommissionPaid, &0i128);

        // Mark as initialized
        env.storage().instance().set(&DataKey::Initialized, &true);

        // Emit initialization event
        env.events().publish(
            (symbol_short!("aff_init"), admin),
            (config.default_commission_rate_bps,),
        );

        Ok(())
    }

    /// Register as an affiliate
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `affiliate` - Address registering as affiliate
    /// * `referral_code` - Unique referral code
    /// * `commission_rate_bps` - Commission rate in basis points (0 for default)
    ///
    /// # Returns
    ///
    /// * `Ok(bool)` - True if registration successful
    /// * `Err(CommonError)` - If validation fails or code already exists
    pub fn register_affiliate(
        env: Env,
        affiliate: Address,
        referral_code: Symbol,
        commission_rate_bps: u32,
    ) -> Result<bool, CommonError> {
        affiliate.require_auth();

        // Check if already initialized
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(CommonError::NotInitialized);
        }

        // Check if already an affiliate
        if env.storage().persistent().has(&DataKey::Affiliate(affiliate.clone())) {
            return Err(CommonError::AlreadyInitialized);
        }

        // Check if referral code already exists
        if env.storage().persistent().has(&DataKey::AffiliateCodeIndex(referral_code.clone())) {
            return Err(CommonError::AlreadyInitialized);
        }

        // Get config
        let config: AffiliateConfig = env.storage().instance().get(&DataKey::AffiliateConfig).unwrap();

        // Validate commission rate
        let rate = if commission_rate_bps > 0 { 
            commission_rate_bps 
        } else { 
            config.default_commission_rate_bps 
        };

        if rate > config.max_commission_rate_bps {
            return Err(CommonError::OutOfRange);
        }

        // Generate affiliate ID
        let affiliate_count: u64 = env.storage().instance().get(&DataKey::AffiliateCount).unwrap();

        // Create affiliate record
        let affiliate_record = Affiliate {
            address: affiliate.clone(),
            referral_code: referral_code.clone(),
            status: AffiliateStatus::Active,
            commission_rate_bps: rate,
            referred_count: 0,
            total_commission_earned: 0,
            total_commission_withdrawn: 0,
            registered_at: env.ledger().timestamp(),
            level: 1,
        };

        // Store affiliate
        env.storage().persistent().set(&DataKey::Affiliate(affiliate.clone()), &affiliate_record);
        env.storage().persistent().set(&DataKey::AffiliateCodeIndex(referral_code), &affiliate.clone());
        env.storage().persistent().set(&DataKey::ReferralCode(affiliate.clone()), &referral_code);
        env.storage().instance().set(&DataKey::AffiliateCount, &(affiliate_count + 1));

        // Initialize commission tracking
        env.storage().persistent().set(&DataKey::AffiliateCommission(affiliate.clone()), &0i128);
        env.storage().persistent().set(&DataKey::PendingPayouts(affiliate.clone()), &0i128);

        // Emit event
        env.events().publish(
            (symbol_short!("aff_reg"), affiliate),
            (referral_code, rate),
        );

        Ok(true)
    }

    /// Sign up using a referral code
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `user` - User address signing up
    /// * `referral_code` - Referral code used
    ///
    /// # Returns
    ///
    /// * `Ok(bool)` - True if signup successful
    /// * `Err(CommonError)` - If invalid code or already referred
    pub fn signup_with_referral(
        env: Env,
        user: Address,
        referral_code: Symbol,
    ) -> Result<bool, CommonError> {
        user.require_auth();

        // Check if user already has a referrer
        if env.storage().persistent().has(&DataKey::ReferredBy(user.clone())) {
            return Err(CommonError::AlreadyInitialized);
        }

        // Get affiliate from referral code
        let affiliate: Address = env
            .storage()
            .persistent()
            .get(&DataKey::AffiliateCodeIndex(referral_code))
            .ok_or(CommonError::KeyNotFound)?;

        // Verify affiliate is active
        let affiliate_record: Affiliate = env
            .storage()
            .persistent()
            .get(&DataKey::Affiliate(affiliate.clone()))
            .ok_or(CommonError::KeyNotFound)?;

        if affiliate_record.status != AffiliateStatus::Active {
            return Err(CommonError::NotAuthorized);
        }

        // Store referral relationship
        env.storage().persistent().set(&DataKey::ReferredBy(user.clone()), &affiliate);

        // Update affiliate's referred count
        let mut updated_affiliate = affiliate_record;
        updated_affiliate.referred_count += 1;
        env.storage().persistent().set(&DataKey::Affiliate(affiliate.clone()), &updated_affiliate);

        // Initialize user volume tracking
        let volume_record = UserVolumeRecord {
            user: user.clone(),
            total_volume: 0,
            period_volume: 0,
            period_start: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&DataKey::UserVolume(user.clone()), &volume_record);

        // Handle multi-level referrals
        let config: AffiliateConfig = env.storage().instance().get(&DataKey::AffiliateConfig).unwrap();
        if config.multi_level_enabled {
            Self::register_multi_level_referral(&env, user.clone(), affiliate.clone(), config.referral_levels)?;
        }

        // Emit event
        env.events().publish(
            (symbol_short!("aff_signup"), user),
            (affiliate, referral_code),
        );

        Ok(true)
    }

    /// Record trading volume for a user and calculate commissions
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `user` - User address
    /// * `volume` - Trading volume amount
    ///
    /// # Returns
    ///
    /// * `Ok(i128)` - Commission amount generated
    /// * `Err(CommonError)` - If validation fails
    pub fn record_volume(
        env: Env,
        user: Address,
        volume: i128,
    ) -> Result<i128, CommonError> {
        // Validate volume
        if volume <= 0 {
            return Err(CommonError::OutOfRange);
        }

        // Update user volume
        let mut volume_record: UserVolumeRecord = env
            .storage()
            .persistent()
            .get(&DataKey::UserVolume(user.clone()))
            .unwrap_or_else(|| UserVolumeRecord {
                user: user.clone(),
                total_volume: 0,
                period_volume: 0,
                period_start: env.ledger().timestamp(),
            });

        volume_record.total_volume += volume;
        volume_record.period_volume += volume;
        env.storage().persistent().set(&DataKey::UserVolume(user.clone()), &volume_record);

        // Update total volume
        let mut total_volume: i128 = env.storage().instance().get(&DataKey::TotalVolume).unwrap_or(0);
        total_volume += volume;
        env.storage().instance().set(&DataKey::TotalVolume, &total_volume);

        // Calculate and distribute commissions
        let commission = Self::calculate_and_distribute_commission(&env, user.clone(), volume)?;

        Ok(commission)
    }

    /// Withdraw pending commissions
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `affiliate` - Affiliate address
    ///
    /// # Returns
    ///
    /// * `Ok(i128)` - Amount withdrawn
    /// * `Err(CommonError)` - If validation fails or insufficient balance
    pub fn withdraw_commission(
        env: Env,
        affiliate: Address,
    ) -> Result<i128, CommonError> {
        affiliate.require_auth();

        // Get pending amount
        let pending: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::PendingPayouts(affiliate.clone()))
            .unwrap_or(0);

        // Check minimum payout
        let config: AffiliateConfig = env.storage().instance().get(&DataKey::AffiliateConfig).unwrap();
        if pending < config.min_payout_amount {
            return Err(CommonError::OutOfRange);
        }

        // Verify affiliate is active
        let affiliate_record: Affiliate = env
            .storage()
            .persistent()
            .get(&DataKey::Affiliate(affiliate.clone()))
            .ok_or(CommonError::KeyNotFound)?;

        if affiliate_record.status != AffiliateStatus::Active {
            return Err(CommonError::NotAuthorized);
        }

        // Update pending amount
        env.storage().persistent().set(&DataKey::PendingPayouts(affiliate.clone()), &0i128);

        // Update affiliate's withdrawn total
        let mut updated_affiliate = affiliate_record;
        updated_affiliate.total_commission_withdrawn += pending;
        env.storage().persistent().set(&DataKey::Affiliate(affiliate.clone()), &updated_affiliate);

        // Record payout
        let payout_count: u64 = env.storage().instance().get(&DataKey::PayoutCount).unwrap_or(0);
        let payout = PayoutRecord {
            payout_id: payout_count,
            affiliate: affiliate.clone(),
            amount: pending,
            timestamp: env.ledger().timestamp(),
            tx_hash: None,
        };
        env.storage().persistent().set(&DataKey::Payout(payout_count), &payout);
        env.storage().instance().set(&DataKey::PayoutCount, &(payout_count + 1));

        // Add to payout history
        let mut payout_history: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::PayoutHistory(affiliate.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        payout_history.push_back(payout_count);
        env.storage().persistent().set(&DataKey::PayoutHistory(affiliate.clone()), &payout_history);

        // Update total commission paid
        let mut total_paid: i128 = env.storage().instance().get(&DataKey::TotalCommissionPaid).unwrap_or(0);
        total_paid += pending;
        env.storage().instance().set(&DataKey::TotalCommissionPaid, &total_paid);

        // Emit event
        env.events().publish(
            (symbol_short!("aff_withdraw"), affiliate),
            (pending, payout_count),
        );

        Ok(pending)
    }

    /// Get affiliate information
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `affiliate` - Affiliate address
    ///
    /// # Returns
    ///
    /// * `Option<Affiliate>` - Affiliate information if exists
    pub fn get_affiliate(env: Env, affiliate: Address) -> Option<Affiliate> {
        env.storage().persistent().get(&DataKey::Affiliate(affiliate))
    }

    /// Get pending commission for an affiliate
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `affiliate` - Affiliate address
    ///
    /// # Returns
    ///
    /// * `i128` - Pending commission amount
    pub fn get_pending_commission(env: Env, affiliate: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::PendingPayouts(affiliate))
            .unwrap_or(0)
    }

    /// Get user's referrer
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `user` - User address
    ///
    /// # Returns
    ///
    /// * `Option<Address>` - Referrer address if exists
    pub fn get_referrer(env: Env, user: Address) -> Option<Address> {
        env.storage().persistent().get(&DataKey::ReferredBy(user))
    }

    /// Get user's trading volume
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `user` - User address
    ///
    /// # Returns
    ///
    /// * `UserVolumeRecord` - User's volume information
    pub fn get_user_volume(env: Env, user: Address) -> UserVolumeRecord {
        env.storage()
            .persistent()
            .get(&DataKey::UserVolume(user))
            .unwrap_or_else(|| UserVolumeRecord {
                user: Address::generate(&env),
                total_volume: 0,
                period_volume: 0,
                period_start: 0,
            })
    }

    /// Get affiliate's payout history
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `affiliate` - Affiliate address
    ///
    /// # Returns
    ///
    /// * `Vec<PayoutRecord>` - List of payout records
    pub fn get_payout_history(env: Env, affiliate: Address) -> Vec<PayoutRecord> {
        let mut payouts = Vec::new(&env);
        
        if let Some(payout_ids) = env.storage().persistent().get::<_, Vec<u64>>(&DataKey::PayoutHistory(affiliate)) {
            for payout_id in payout_ids.iter() {
                if let Some(payout) = env.storage().persistent().get(&DataKey::Payout(payout_id)) {
                    payouts.push_back(payout);
                }
            }
        }

        payouts
    }

    /// Update affiliate configuration (admin only)
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `admin` - Admin address
    /// * `config` - New configuration
    pub fn update_config(
        env: Env,
        admin: Address,
        config: AffiliateConfig,
    ) -> Result<(), CommonError> {
        Self::require_admin(&env, &admin)?;
        
        // Validate commission rates
        if config.default_commission_rate_bps > config.max_commission_rate_bps {
            return Err(CommonError::OutOfRange);
        }
        
        env.storage().instance().set(&DataKey::AffiliateConfig, &config);
        
        env.events().publish(
            (symbol_short!("aff_cfg_upd"), admin),
            symbol_short!("updated"),
        );

        Ok(())
    }

    /// Suspend an affiliate (admin only)
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `admin` - Admin address
    /// * `affiliate` - Affiliate address to suspend
    pub fn suspend_affiliate(
        env: Env,
        admin: Address,
        affiliate: Address,
    ) -> Result<(), CommonError> {
        Self::require_admin(&env, &admin)?;

        let mut affiliate_record: Affiliate = env
            .storage()
            .persistent()
            .get(&DataKey::Affiliate(affiliate.clone()))
            .ok_or(CommonError::KeyNotFound)?;

        affiliate_record.status = AffiliateStatus::Suspended;
        env.storage().persistent().set(&DataKey::Affiliate(affiliate.clone()), &affiliate_record);

        env.events().publish(
            (symbol_short!("aff_suspend"), admin),
            affiliate,
        );

        Ok(())
    }

    // ========================================================================
    // Internal Helper Functions
    // ========================================================================

    /// Calculate and distribute commission to affiliates
    fn calculate_and_distribute_commission(
        env: &Env,
        user: Address,
        volume: i128,
    ) -> Result<i128, CommonError> {
        let mut total_commission = 0i128;

        // Get direct referrer
        if let Some(referrer) = env.storage().persistent().get::<_, Address>(&DataKey::ReferredBy(user)) {
            let affiliate: Affiliate = env
                .storage()
                .persistent()
                .get(&DataKey::Affiliate(referrer.clone()))
                .ok_or(CommonError::KeyNotFound)?;

            if affiliate.status == AffiliateStatus::Active {
                // Calculate commission
                let commission = (volume * affiliate.commission_rate_bps as i128) / 10000;
                total_commission += commission;

                // Add to pending payouts
                let mut pending: i128 = env
                    .storage()
                    .persistent()
                    .get(&DataKey::PendingPayouts(referrer.clone()))
                    .unwrap_or(0);
                pending += commission;
                env.storage().persistent().set(&DataKey::PendingPayouts(referrer.clone()), &pending);

                // Update affiliate's earned total
                let mut updated_affiliate = affiliate;
                updated_affiliate.total_commission_earned += commission;
                env.storage().persistent().set(&DataKey::Affiliate(referrer.clone()), &updated_affiliate);

                // Record commission
                Self::record_commission(env, referrer, user.clone(), volume, commission, affiliate.commission_rate_bps)?;
            }
        }

        Ok(total_commission)
    }

    /// Record commission transaction
    fn record_commission(
        env: &Env,
        affiliate: Address,
        referred_user: Address,
        volume: i128,
        commission: i128,
        commission_rate_bps: u32,
    ) -> Result<(), CommonError> {
        let event_count: u64 = env.storage().instance().get(&DataKey::EventCount).unwrap_or(0);

        let record = CommissionRecord {
            record_id: event_count,
            affiliate,
            referred_user,
            volume,
            commission,
            commission_rate_bps,
            timestamp: env.ledger().timestamp(),
        };

        // Add to commission history
        let mut history: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::CommissionHistory(affiliate.clone()))
            .unwrap_or_else(|| Vec::new(env));
        history.push_back(event_count);
        env.storage().persistent().set(&DataKey::CommissionHistory(affiliate), &history);

        env.storage().instance().set(&DataKey::EventCount, &(event_count + 1));

        Ok(())
    }

    /// Register multi-level referral relationships
    fn register_multi_level_referral(
        env: &Env,
        user: Address,
        direct_referrer: Address,
        levels: u32,
    ) -> Result<(), CommonError> {
        // This is a simplified implementation
        // In production, you would traverse the referral tree up to 'levels' depth
        // and register indirect relationships
        
        // For now, we just store the direct referral
        // Multi-level logic would require more complex tree traversal
        Ok(())
    }

    /// Require admin authorization
    fn require_admin(env: &Env, admin: &Address) -> Result<(), CommonError> {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(CommonError::NotInitialized)?;

        if stored_admin != *admin {
            return Err(CommonError::NotAuthorized);
        }

        admin.require_auth();
        Ok(())
    }
}