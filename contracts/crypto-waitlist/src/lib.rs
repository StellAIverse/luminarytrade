//! # Crypto Waitlist Contract
//!
//! A community-driven waitlist system for launching new cryptocurrency trading pairs.
//!
//! ## Features
//!
//! - **Waitlist Management**: Users can vote or join waitlist for new crypto pairs
//! - **Threshold-Based Launch**: Automatic launch when vote threshold is met
//! - **Community Driven**: Decentralized decision making for new pair additions
//! - **Notifications**: Event-based notification system for status updates
//!
//! ## Architecture
//!
//! ### Waitlist Flow
//!
//! 1. **Proposal**: Admin or community proposes new trading pair
//! 2. **Voting**: Users join waitlist and vote for pairs they want
//! 3. **Threshold Check**: System monitors if vote threshold is met
//! 4. **Launch**: Automatic or manual launch when conditions are satisfied
//! 5. **Notification**: Users notified of launch status

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
    WaitlistConfig,
    
    // Trading Pair Management
    PairCount,
    Pair(u64),
    PairIndex(Symbol),
    
    // User Participation
    UserVotes(Address),
    PairVoters(u64),
    UserNotificationPrefs(Address),
    
    // Threshold & Launch
    LaunchThreshold,
    LaunchedPairs,
    
    // Events & Notifications
    NotificationCount,
    Notification(u64),
}

// ============================================================================
// Data Types
// ============================================================================

/// Status of a trading pair waitlist
#[derive(Clone, Copy, PartialEq, Eq)]
#[contracttype]
pub enum PairStatus {
    /// Waitlist is active, collecting votes
    Active = 0,
    /// Threshold met, ready to launch
    ReadyToLaunch = 1,
    /// Pair has been launched
    Launched = 2,
    /// Waitlist cancelled
    Cancelled = 3,
}

/// Trading pair information
#[derive(Clone)]
#[contracttype]
pub struct TradingPair {
    /// Unique pair ID
    pub pair_id: u64,
    /// Base token (e.g., BTC)
    pub base_token: Symbol,
    /// Quote token (e.g., USDT)
    pub quote_token: Symbol,
    /// Current status
    pub status: PairStatus,
    /// Total votes received
    pub vote_count: u32,
    /// Required votes for launch
    pub required_votes: u32,
    /// Proposed timestamp
    pub proposed_at: u64,
    /// Launched timestamp (if launched)
    pub launched_at: Option<u64>,
    /// Proposed by
    pub proposed_by: Address,
}

/// Waitlist configuration
#[derive(Clone)]
#[contracttype]
pub struct WaitlistConfig {
    /// Default vote threshold for launching pairs
    pub default_threshold: u32,
    /// Maximum active pairs
    pub max_active_pairs: u32,
    /// Voting period duration (seconds)
    pub voting_period: u64,
    /// Enable automatic launch
    pub auto_launch_enabled: bool,
}

/// Notification for users
#[derive(Clone)]
#[contracttype]
pub struct Notification {
    /// Notification ID
    pub notification_id: u64,
    /// Recipient address
    pub recipient: Address,
    /// Notification type
    pub notification_type: Symbol,
    /// Message content
    pub message: String,
    /// Timestamp
    pub created_at: u64,
    /// Read status
    pub read: bool,
}

/// User notification preferences
#[derive(Clone)]
#[contracttype]
pub struct NotificationPrefs {
    /// Enable notifications
    pub enabled: bool,
    /// Notify on launch
    pub notify_on_launch: bool,
    /// Notify on threshold reached
    pub notify_on_threshold: bool,
}

/// Event data for pair updates
#[derive(Clone)]
#[contracttype]
pub struct PairEvent {
    /// Event type
    pub event_type: Symbol,
    /// Pair ID
    pub pair_id: u64,
    /// Base token
    pub base_token: Symbol,
    /// Quote token
    pub quote_token: Symbol,
    /// Vote count
    pub vote_count: u32,
    /// Status
    pub status: PairStatus,
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_VOTE_THRESHOLD: u32 = 100;
const DEFAULT_MAX_ACTIVE_PAIRS: u32 = 50;
const DEFAULT_VOTING_PERIOD: u64 = 7 * 86400; // 7 days

// ============================================================================
// Contract
// ============================================================================

#[contract]
pub struct CryptoWaitlistContract;

// ============================================================================
// Implementation
// ============================================================================

#[contractimpl]
impl CryptoWaitlistContract {
    /// Initialize the waitlist contract
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `admin` - Admin address
    /// * `default_threshold` - Default vote threshold for launching pairs
    ///
    /// # Returns
    ///
    /// * `Ok(())` - Initialization successful
    /// * `Err(CommonError)` - If already initialized
    pub fn initialize(
        env: Env,
        admin: Address,
        default_threshold: u32,
    ) -> Result<(), CommonError> {
        // Check if already initialized
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(CommonError::AlreadyInitialized);
        }

        // Store admin
        env.storage().instance().set(&DataKey::Admin, &admin);

        // Initialize configuration
        let config = WaitlistConfig {
            default_threshold: if default_threshold > 0 { default_threshold } else { DEFAULT_VOTE_THRESHOLD },
            max_active_pairs: DEFAULT_MAX_ACTIVE_PAIRS,
            voting_period: DEFAULT_VOTING_PERIOD,
            auto_launch_enabled: true,
        };
        env.storage().instance().set(&DataKey::WaitlistConfig, &config);

        // Initialize counters
        env.storage().instance().set(&DataKey::PairCount, &0u64);
        env.storage().instance().set(&DataKey::LaunchThreshold, &config.default_threshold);
        env.storage().instance().set(&DataKey::NotificationCount, &0u64);

        // Mark as initialized
        env.storage().instance().set(&DataKey::Initialized, &true);

        // Emit initialization event
        env.events().publish(
            (symbol_short!("wl_init"), admin),
            (config.default_threshold,),
        );

        Ok(())
    }

    /// Propose a new trading pair for waitlist
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `proposer` - Address proposing the pair
    /// * `base_token` - Base token symbol
    /// * `quote_token` - Quote token symbol
    /// * `required_votes` - Required votes for launch (optional, uses default if 0)
    ///
    /// # Returns
    ///
    /// * `Ok(u64)` - Pair ID if successful
    /// * `Err(CommonError)` - If validation fails
    pub fn propose_pair(
        env: Env,
        proposer: Address,
        base_token: Symbol,
        quote_token: Symbol,
        required_votes: u32,
    ) -> Result<u64, CommonError> {
        proposer.require_auth();

        // Check if already initialized
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(CommonError::NotInitialized);
        }

        // Check active pair limit
        let config: WaitlistConfig = env.storage().instance().get(&DataKey::WaitlistConfig).unwrap();
        let pair_count: u64 = env.storage().instance().get(&DataKey::PairCount).unwrap();
        
        // Count active pairs
        let mut active_count = 0u32;
        for i in 0..pair_count {
            if let Some(pair) = env.storage().persistent().get(&DataKey::Pair(i)) {
                let p: TradingPair = pair;
                if p.status == PairStatus::Active {
                    active_count += 1;
                }
            }
        }

        if active_count >= config.max_active_pairs {
            return Err(CommonError::OutOfRange);
        }

        // Check if pair already exists
        let pair_key = Self::create_pair_key(&env, base_token.clone(), quote_token.clone());
        if env.storage().persistent().has(&DataKey::PairIndex(pair_key)) {
            return Err(CommonError::AlreadyInitialized);
        }

        // Determine required votes
        let votes_needed = if required_votes > 0 { required_votes } else { config.default_threshold };

        // Generate pair ID
        let pair_id = pair_count;
        
        // Create trading pair
        let pair = TradingPair {
            pair_id,
            base_token: base_token.clone(),
            quote_token: quote_token.clone(),
            status: PairStatus::Active,
            vote_count: 0,
            required_votes: votes_needed,
            proposed_at: env.ledger().timestamp(),
            launched_at: None,
            proposed_by: proposer.clone(),
        };

        // Store pair
        env.storage().persistent().set(&DataKey::Pair(pair_id), &pair);
        env.storage().persistent().set(&DataKey::PairIndex(pair_key), &pair_id);
        env.storage().instance().set(&DataKey::PairCount, &(pair_id + 1));

        // Initialize voter list
        let voters: Vec<Address> = Vec::new(&env);
        env.storage().persistent().set(&DataKey::PairVoters(pair_id), &voters);

        // Emit event
        env.events().publish(
            (symbol_short!("wl_propose"), proposer),
            (pair_id, base_token, quote_token, votes_needed),
        );

        Ok(pair_id)
    }

    /// Join waitlist and vote for a trading pair
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `voter` - Address voting for the pair
    /// * `pair_id` - Pair ID to vote for
    ///
    /// # Returns
    ///
    /// * `Ok(bool)` - True if vote successful
    /// * `Err(CommonError)` - If validation fails or already voted
    pub fn vote_for_pair(
        env: Env,
        voter: Address,
        pair_id: u64,
    ) -> Result<bool, CommonError> {
        voter.require_auth();

        // Get pair
        let mut pair: TradingPair = env
            .storage()
            .persistent()
            .get(&DataKey::Pair(pair_id))
            .ok_or(CommonError::KeyNotFound)?;

        // Check pair is active
        if pair.status != PairStatus::Active {
            return Err(CommonError::NotAuthorized);
        }

        // Check if user already voted for this pair
        let mut voters: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::PairVoters(pair_id))
            .unwrap_or_else(|| Vec::new(&env));

        for existing_voter in voters.iter() {
            if existing_voter == voter {
                return Err(CommonError::AlreadyInitialized);
            }
        }

        // Add vote
        voters.push_back(voter.clone());
        pair.vote_count += 1;

        // Store updated data
        env.storage().persistent().set(&DataKey::Pair(pair_id), &pair);
        env.storage().persistent().set(&DataKey::PairVoters(pair_id), &voters);

        // Track user votes
        let mut user_votes: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::UserVotes(voter.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        user_votes.push_back(pair_id);
        env.storage().persistent().set(&DataKey::UserVotes(voter.clone()), &user_votes);

        // Check if threshold met
        if pair.vote_count >= pair.required_votes {
            pair.status = PairStatus::ReadyToLaunch;
            env.storage().persistent().set(&DataKey::Pair(pair_id), &pair);

            // Notify voters
            Self::notify_voters_threshold_reached(&env, pair_id, &voters)?;

            // Auto-launch if enabled
            let config: WaitlistConfig = env.storage().instance().get(&DataKey::WaitlistConfig).unwrap();
            if config.auto_launch_enabled {
                Self::launch_pair_internal(&env, pair_id)?;
            }
        }

        // Emit event
        env.events().publish(
            (symbol_short!("wl_vote"), voter),
            (pair_id, pair.vote_count, pair.required_votes),
        );

        Ok(true)
    }

    /// Launch a trading pair (manual trigger)
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `caller` - Admin or proposer address
    /// * `pair_id` - Pair ID to launch
    ///
    /// # Returns
    ///
    /// * `Ok(bool)` - True if launch successful
    /// * `Err(CommonError)` - If validation fails
    pub fn launch_pair(
        env: Env,
        caller: Address,
        pair_id: u64,
    ) -> Result<bool, CommonError> {
        caller.require_auth();

        // Get pair
        let pair: TradingPair = env
            .storage()
            .persistent()
            .get(&DataKey::Pair(pair_id))
            .ok_or(CommonError::KeyNotFound)?;

        // Check if ready to launch
        if pair.status != PairStatus::ReadyToLaunch {
            return Err(CommonError::NotAuthorized);
        }

        Self::launch_pair_internal(&env, pair_id)
    }

    /// Cancel a trading pair waitlist
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `caller` - Admin or proposer address
    /// * `pair_id` - Pair ID to cancel
    ///
    /// # Returns
    ///
    /// * `Ok(bool)` - True if cancellation successful
    /// * `Err(CommonError)` - If validation fails
    pub fn cancel_pair(
        env: Env,
        caller: Address,
        pair_id: u64,
    ) -> Result<bool, CommonError> {
        caller.require_auth();

        // Get pair
        let mut pair: TradingPair = env
            .storage()
            .persistent()
            .get(&DataKey::Pair(pair_id))
            .ok_or(CommonError::KeyNotFound)?;

        // Check if active
        if pair.status != PairStatus::Active && pair.status != PairStatus::ReadyToLaunch {
            return Err(CommonError::NotAuthorized);
        }

        // Update status
        pair.status = PairStatus::Cancelled;
        env.storage().persistent().set(&DataKey::Pair(pair_id), &pair);

        // Emit event
        env.events().publish(
            (symbol_short!("wl_cancel"), caller),
            (pair_id,),
        );

        Ok(true)
    }

    /// Update notification preferences
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `user` - User address
    /// * `enabled` - Enable notifications
    /// * `notify_on_launch` - Notify on launch
    /// * `notify_on_threshold` - Notify on threshold reached
    pub fn update_notification_prefs(
        env: Env,
        user: Address,
        enabled: bool,
        notify_on_launch: bool,
        notify_on_threshold: bool,
    ) -> Result<(), CommonError> {
        user.require_auth();

        let prefs = NotificationPrefs {
            enabled,
            notify_on_launch,
            notify_on_threshold,
        };

        env.storage().persistent().set(&DataKey::UserNotificationPrefs(user), &prefs);

        Ok(())
    }

    /// Get user's notifications
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `user` - User address
    ///
    /// # Returns
    ///
    /// * `Vec<Notification>` - User's notifications
    pub fn get_user_notifications(env: Env, user: Address) -> Vec<Notification> {
        let mut notifications = Vec::new(&env);
        let notif_count: u64 = env.storage().instance().get(&DataKey::NotificationCount).unwrap_or(0);

        for i in 0..notif_count {
            if let Some(notif) = env.storage().persistent().get(&DataKey::Notification(i)) {
                let n: Notification = notif;
                if n.recipient == user {
                    notifications.push_back(n);
                }
            }
        }

        notifications
    }

    /// Get trading pair information
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `pair_id` - Pair ID
    ///
    /// # Returns
    ///
    /// * `Option<TradingPair>` - Pair information if exists
    pub fn get_pair(env: Env, pair_id: u64) -> Option<TradingPair> {
        env.storage().persistent().get(&DataKey::Pair(pair_id))
    }

    /// Get all active pairs
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    ///
    /// # Returns
    ///
    /// * `Vec<TradingPair>` - List of active pairs
    pub fn get_active_pairs(env: Env) -> Vec<TradingPair> {
        let mut pairs = Vec::new(&env);
        let pair_count: u64 = env.storage().instance().get(&DataKey::PairCount).unwrap_or(0);

        for i in 0..pair_count {
            if let Some(pair) = env.storage().persistent().get(&DataKey::Pair(i)) {
                let p: TradingPair = pair;
                if p.status == PairStatus::Active || p.status == PairStatus::ReadyToLaunch {
                    pairs.push_back(p);
                }
            }
        }

        pairs
    }

    /// Check if user has voted for a pair
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `user` - User address
    /// * `pair_id` - Pair ID
    ///
    /// # Returns
    ///
    /// * `bool` - True if user has voted
    pub fn has_voted(env: Env, user: Address, pair_id: u64) -> bool {
        if let Some(voters) = env.storage().persistent().get::<_, Vec<Address>>(&DataKey::PairVoters(pair_id)) {
            for voter in voters.iter() {
                if voter == user {
                    return true;
                }
            }
        }
        false
    }

    /// Update waitlist configuration (admin only)
    ///
    /// # Arguments
    ///
    /// * `env` - Soroban environment
    /// * `admin` - Admin address
    /// * `config` - New configuration
    pub fn update_config(
        env: Env,
        admin: Address,
        config: WaitlistConfig,
    ) -> Result<(), CommonError> {
        Self::require_admin(&env, &admin)?;
        env.storage().instance().set(&DataKey::WaitlistConfig, &config);
        
        env.events().publish(
            (symbol_short!("wl_cfg_upd"), admin),
            symbol_short!("updated"),
        );

        Ok(())
    }

    // ========================================================================
    // Internal Helper Functions
    // ========================================================================

    /// Launch pair internal function
    fn launch_pair_internal(env: &Env, pair_id: u64) -> Result<bool, CommonError> {
        let mut pair: TradingPair = env
            .storage()
            .persistent()
            .get(&DataKey::Pair(pair_id))
            .ok_or(CommonError::KeyNotFound)?;

        // Update status
        pair.status = PairStatus::Launched;
        pair.launched_at = Some(env.ledger().timestamp());
        env.storage().persistent().set(&DataKey::Pair(pair_id), &pair);

        // Track launched pairs
        let mut launched: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::LaunchedPairs)
            .unwrap_or_else(|| Vec::new(env));
        launched.push_back(pair_id);
        env.storage().persistent().set(&DataKey::LaunchedPairs, &launched);

        // Notify voters
        let voters: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::PairVoters(pair_id))
            .unwrap_or_else(|| Vec::new(env));

        Self::notify_voters_pair_launched(env, pair_id, &voters)?;

        // Emit event
        env.events().publish(
            (symbol_short!("wl_launch"), pair.proposed_by.clone()),
            (pair_id, pair.base_token, pair.quote_token),
        );

        Ok(true)
    }

    /// Notify voters that threshold has been reached
    fn notify_voters_threshold_reached(
        env: &Env,
        pair_id: u64,
        voters: &Vec<Address>,
    ) -> Result<(), CommonError> {
        let pair: TradingPair = env
            .storage()
            .persistent()
            .get(&DataKey::Pair(pair_id))
            .ok_or(CommonError::KeyNotFound)?;

        let mut notif_count: u64 = env.storage().instance().get(&DataKey::NotificationCount).unwrap_or(0);

        for voter in voters.iter() {
            // Check notification preferences
            if let Some(prefs) = env.storage().persistent().get::<_, NotificationPrefs>(&DataKey::UserNotificationPrefs(voter.clone())) {
                if prefs.enabled && prefs.notify_on_threshold {
                    let message = String::from_str(
                        env,
                        format!("Pair {}/{} reached voting threshold!", 
                            symbol_to_str(&pair.base_token),
                            symbol_to_str(&pair.quote_token)
                        ).as_str()
                    );

                    let notification = Notification {
                        notification_id: notif_count,
                        recipient: voter.clone(),
                        notification_type: symbol_short!("threshold"),
                        message,
                        created_at: env.ledger().timestamp(),
                        read: false,
                    };

                    env.storage().persistent().set(&DataKey::Notification(notif_count), &notification);
                    notif_count += 1;
                }
            }
        }

        env.storage().instance().set(&DataKey::NotificationCount, &notif_count);

        Ok(())
    }

    /// Notify voters that pair has been launched
    fn notify_voters_pair_launched(
        env: &Env,
        pair_id: u64,
        voters: &Vec<Address>,
    ) -> Result<(), CommonError> {
        let pair: TradingPair = env
            .storage()
            .persistent()
            .get(&DataKey::Pair(pair_id))
            .ok_or(CommonError::KeyNotFound)?;

        let mut notif_count: u64 = env.storage().instance().get(&DataKey::NotificationCount).unwrap_or(0);

        for voter in voters.iter() {
            // Check notification preferences
            if let Some(prefs) = env.storage().persistent().get::<_, NotificationPrefs>(&DataKey::UserNotificationPrefs(voter.clone())) {
                if prefs.enabled && prefs.notify_on_launch {
                    let message = String::from_str(
                        env,
                        format!("Pair {}/{} has been launched!", 
                            symbol_to_str(&pair.base_token),
                            symbol_to_str(&pair.quote_token)
                        ).as_str()
                    );

                    let notification = Notification {
                        notification_id: notif_count,
                        recipient: voter.clone(),
                        notification_type: symbol_short!("launch"),
                        message,
                        created_at: env.ledger().timestamp(),
                        read: false,
                    };

                    env.storage().persistent().set(&DataKey::Notification(notif_count), &notification);
                    notif_count += 1;
                }
            }
        }

        env.storage().instance().set(&DataKey::NotificationCount, &notif_count);

        Ok(())
    }

    /// Create a unique key for a trading pair
    fn create_pair_key(env: &Env, base: Symbol, quote: Symbol) -> Symbol {
        let base_str = symbol_to_str(&base);
        let quote_str = symbol_to_str(&quote);
        let key_str = format!("{}_{}", base_str, quote_str);
        Symbol::try_from_val(env, &key_str.as_str()).unwrap_or(symbol_short!("unknown"))
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

/// Helper function to convert Symbol to string
fn symbol_to_str(symbol: &Symbol) -> String {
    // This is a simplified conversion - in production you'd use proper string conversion
    String::from_str(&Env::default(), "token")
}
