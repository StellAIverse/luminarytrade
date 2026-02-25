#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, symbol_short, Symbol, Vec};
use common_utils::error::{AuthorizationError, StateError, ValidationError, ContractError};
use common_utils::{rate_limit, rate_limit_adaptive};
use common_utils::rate_limit::{RateLimiter, TrustTier};
use common_utils::storage_optimization::{ScoreStorage, DataSeparator, DataTemperature};
use common_utils::storage_monitoring::{StorageTracker, PerformanceMonitor};
use common_utils::data_migration::{DataMigrationManager, MigrationConfig, CompressionType};
use common_utils::compression::{CompressionManager, CompressionType};
use common_utils::state_machine::{State, StateMachine, CreditScoreState};
use common_utils::{state_guard, transition_to};

#[contracttype]
pub enum DataKey {
    Admin,
    Score(Address),
    Factors(Address),
    MigrationState,
    ContractState,
}

#[contract]
pub struct CreditScoreContract;

impl StateMachine<CreditScoreState> for CreditScoreContract {
    fn get_state(env: &Env) -> State<CreditScoreState> {
        env.storage()
            .instance()
            .get(&DataKey::ContractState)
            .unwrap_or(State::Uninitialized)
    }

    fn set_state(env: &Env, state: State<CreditScoreState>) {
        env.storage().instance().set(&DataKey::ContractState, &state);
    }
}

#[contractimpl]
impl CreditScoreContract {
    /// Initialize the credit score contract
    pub fn initialize(env: Env, admin: Address) -> Result<(), StateError> {
        // Ensure contract is uninitialized
        let current_state = Self::get_state(&env);
        if !current_state.is_uninitialized() {
            return Err(StateError::AlreadyInitialized);
        }

        // Transition to Active state
        let initial_state = State::Active(CreditScoreState {
            admin: admin.clone(),
            total_scores: 0,
        });
        
        transition_to!(Self, &env, initial_state)?;
        
        // Store admin for backward compatibility
        env.storage().instance().set(&DataKey::Admin, &admin);
        
        env.events().publish(
            (symbol_short!("init"),),
            admin,
        );
        
        Ok(())
    }

    /// Set a user's trust tier (Admin only)
    pub fn set_user_trust_tier(
        env: Env,
        admin: Address,
        user: Address,
        tier: TrustTier,
    ) -> Result<(), AuthorizationError> {
        // State guard: contract must be active
        state_guard!(Self, &env, active);
        
        let state = Self::get_state(&env);
        let state_data = state.get_data().ok_or(AuthorizationError::NotInitialized)?;
        
        if state_data.admin != admin {
            return Err(AuthorizationError::NotAuthorized);
        }
        admin.require_auth();
        
        RateLimiter::set_trust_tier(&env, &user, &tier);
        Ok(())
    }

    /// Update network load multiplier (Admin only)
    pub fn set_network_load(
        env: Env,
        admin: Address,
        load: u32,
    ) -> Result<(), AuthorizationError> {
        // State guard: contract must be active
        state_guard!(Self, &env, active);
        
        let state = Self::get_state(&env);
        let state_data = state.get_data().ok_or(AuthorizationError::NotInitialized)?;
        
        if state_data.admin != admin {
            return Err(AuthorizationError::NotAuthorized);
        }
        admin.require_auth();
        
        RateLimiter::set_network_load(&env, load);
        Ok(())
    }

    /// Calculate credit score for an account
    pub fn calculate_score(
        env: Env,
        account_id: String,
    ) -> Result<u32, ValidationError> {
        // State guard: contract must be active
        state_guard!(Self, &env, active);
        
        // Validate account_id is not empty
        if account_id.is_empty() {
            return Err(ValidationError::MissingRequiredField);
        }

        // TODO: Implement credit scoring logic
        // For now, return a default score
        Ok(500)
    }

    /// Get credit score for an account (rate-limited)
    pub fn get_score(env: Env, account_id: Address) -> Result<u32, AuthorizationError> {
        // Allow reads even when paused, but not when uninitialized or terminated
        if Self::require_initialized(&env).is_err() {
            return Err(AuthorizationError::NotInitialized);
        }
        
        // Rate limit: 60 reads per hour per user (adaptive)
        rate_limit_adaptive!(env, account_id, "get_score",
            max: 60, window: 3600,
            strategy: TokenBucket, scope: PerUser);

        let _timer = PerformanceMonitor::start_timer(&env, &symbol_short!("get_score"));
        
        let result = ScoreStorage::get_score(&env, &account_id)
            .map_err(|_| AuthorizationError::NotAuthorized)?;
        
        // Record access
        StorageTracker::record_operation(
            &env, 
            &symbol_short!("access"), 
            &symbol_short!("score"), 
            4, 
            false
        );
        
        let _duration = PerformanceMonitor::end_timer(&env, &symbol_short!("get_score"));
        
        Ok(result)
    }

    /// Update credit score factors (Admin only, rate-limited)
    pub fn update_factors(
        env: Env,
        account_id: Address,
        factors: String,
    ) -> Result<(), AuthorizationError> {
        // State guard: contract must be active
        state_guard!(Self, &env, active);
        
        // Rate limit: 20 updates per hour globally
        rate_limit!(env, account_id, "upd_factor",
            max: 20, window: 3600,
            strategy: FixedWindow, scope: Global);
        
        let state = Self::get_state(&env);
        let state_data = state.get_data().ok_or(AuthorizationError::NotInitialized)?;
        
        state_data.admin.require_auth();

        // Compress factors before storing
        let factors_bytes = factors.into_bytes();
        let compressed_factors = CompressionManager::compress(
            &soroban_sdk::Bytes::from_slice(&env, &factors_bytes), 
            &CompressionType::RunLength
        ).map_err(|_| AuthorizationError::NotAuthorized)?;

        env.storage()
            .persistent()
            .set(&DataKey::Factors(account_id), &compressed_factors);
            
        // Record storage operation
        StorageTracker::record_operation(
            &env, 
            &symbol_short!("store"), 
            &symbol_short!("factors"), 
            compressed_factors.len() as u32, 
            true
        );
        
        Ok(())
    }

    /// Set credit score for an account (Admin only, rate-limited)
    pub fn set_score(
        env: Env,
        account_id: Address,
        score: u32,
    ) -> Result<(), AuthorizationError> {
        // State guard: contract must be active
        state_guard!(Self, &env, active);
        
        // Rate limit: 30 score-sets per hour per user
        rate_limit!(env, account_id, "set_score",
            max: 30, window: 3600,
            strategy: SlidingWindow, scope: PerUser);
        
        let state = Self::get_state(&env);
        let state_data = state.get_data().ok_or(AuthorizationError::NotInitialized)?;
        
        state_data.admin.require_auth();

        // Store score with compression
        ScoreStorage::store_score(&env, &account_id, score, env.ledger().timestamp())
            .map_err(|_| AuthorizationError::NotAuthorized)?;
        
        // Update total scores count in state
        let mut new_state_data = state_data.clone();
        new_state_data.total_scores += 1;
        Self::set_state(&env, State::Active(new_state_data));
        
        // Record storage operation
        StorageTracker::record_operation(
            &env, 
            &symbol_short!("store"), 
            &symbol_short!("score"), 
            44, 
            true
        );
        
        Ok(())
    }
    
    /// Get credit score history for an account
    pub fn get_score_history(env: Env, account_id: Address, limit: u32) -> Result<Vec<common_utils::storage_optimization::ScoreData>, AuthorizationError> {
        // Allow reads even when paused, but not when uninitialized or terminated
        if Self::require_initialized(&env).is_err() {
            return Err(AuthorizationError::NotInitialized);
        }
        let _timer = PerformanceMonitor::start_timer(&env, &symbol_short!("get_score_history"));
        
        let result = ScoreStorage::get_score_history(&env, &account_id, limit)
            .map_err(|_| AuthorizationError::NotAuthorized)?;
        
        // Record access
        StorageTracker::record_operation(
            &env, 
            &symbol_short!("access"), 
            &symbol_short!("history"), 
            0, 
            false
        );
        
        let _duration = PerformanceMonitor::end_timer(&env, &symbol_short!("get_score_history"));
        
        Ok(result)
    }
    
    /// Pause the contract (Admin only)
    pub fn pause(env: Env, admin: Address) -> Result<(), StateError> {
        state_guard!(Self, &env, active);
        
        let state = Self::get_state(&env);
        let state_data = state.get_data().ok_or(StateError::NotInitialized)?;
        
        if state_data.admin != admin {
            return Err(StateError::InvalidState);
        }
        admin.require_auth();
        
        let paused_state = State::Paused(state_data.clone());
        transition_to!(Self, &env, paused_state)?;
        
        Ok(())
    }

    /// Resume the contract from paused state (Admin only)
    pub fn resume(env: Env, admin: Address) -> Result<(), StateError> {
        let state = Self::get_state(&env);
        if !state.is_paused() {
            return Err(StateError::InvalidState);
        }
        
        let state_data = state.get_data().ok_or(StateError::NotInitialized)?;
        
        if state_data.admin != admin {
            return Err(StateError::InvalidState);
        }
        admin.require_auth();
        
        let active_state = State::Active(state_data.clone());
        transition_to!(Self, &env, active_state)?;
        
        Ok(())
    }

    /// Get the current contract state
    pub fn get_contract_state(env: Env) -> State<CreditScoreState> {
        Self::get_state(&env)
    }

    /// Get total scores count
    pub fn get_total_scores(env: Env) -> Result<u64, StateError> {
        state_guard!(Self, &env, initialized);
        
        let state = Self::get_state(&env);
        let state_data = state.get_data().ok_or(StateError::NotInitialized)?;
        Ok(state_data.total_scores)
    }
    
    /// Migrate existing scores to compressed format
    pub fn migrate_to_compressed(env: Env, admin: Address) -> Result<u64, ContractError> {
        // State guard: must be active to start migration
        state_guard!(Self, &env, active);
        
        let state = Self::get_state(&env);
        let state_data = state.get_data().ok_or(ContractError::NotInitialized)?;
        
        if state_data.admin != admin {
            return Err(ContractError::Unauthorized);
        }
        admin.require_auth();
        
        // Transition to migrating state
        let migrating_state = State::Migrating(state_data.clone());
        transition_to!(Self, &env, migrating_state)?;
        
        // Check if migration is already in progress
        if env.storage().instance().has(&DataKey::MigrationState) {
            return Err(ContractError::InvalidState);
        }
        
        // Get all addresses with scores (simplified)
        let addresses = Self::get_all_score_addresses(&env);
        
        if addresses.is_empty() {
            return Ok(0); // No data to migrate
        }
        
        // Configure migration
        let config = MigrationConfig {
            batch_size: 20,
            max_retries: 3,
            rollback_enabled: true,
            validation_enabled: true,
            compression_type: CompressionType::BitPacking,
            dry_run: false,
        };
        
        // Start migration
        let migration_id = DataMigrationManager::start_migration(&env, &config, &addresses)?;
        
        // Mark migration as in progress
        env.storage().instance().set(&DataKey::MigrationState, &migration_id);
        
        // Execute migration
        DataMigrationManager::execute_migration(&env, migration_id)?;
        
        // Clean up old uncompressed data
        Self::cleanup_uncompressed_scores(&env, &addresses)?;
        
        // Clear migration state
        env.storage().instance().remove(&DataKey::MigrationState);
        
        // Transition back to active after migration
        let active_state = State::Active(state_data);
        transition_to!(Self, &env, active_state)?;
        
        Ok(migration_id)
    }
    
    /// Get storage efficiency report
    pub fn get_efficiency_report(env: Env) -> Result<common_utils::storage_monitoring::StorageEfficiencyReport, ContractError> {
        let report = common_utils::storage_monitoring::EfficiencyAnalyzer::analyze_efficiency(&env)?;
        Ok(report)
    }
    
    /// Get all addresses that have scores
    fn get_all_score_addresses(env: &Env) -> Vec<Symbol> {
        // This is a simplified implementation
        // In practice, you'd maintain an index of all addresses
        Vec::new(env)
    }
    
    /// Clean up uncompressed scores after migration
    fn cleanup_uncompressed_scores(env: &Env, addresses: &Vec<Symbol>) -> Result<(), ContractError> {
        for address_symbol in addresses.iter() {
            // Convert symbol back to address (simplified)
            // In practice, you'd store the actual addresses
            let old_key = DataKey::Score(Address::from_bytes(&soroban_sdk::Bytes::from_slice(env, address_symbol.to_string().as_bytes())));
            env.storage().persistent().remove(&old_key);
        }
        Ok(())
    }
}

#[cfg(test)]
mod test;
