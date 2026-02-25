//! # Fraud Detection Contract
//!
//! Analyzes transactions for potential fraud and manages fraud reports.

#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol, Vec, Val, TryFromVal, Bytes, BytesN,
};
use common_utils::error::CommonError;
use common_utils::migration::DataMigration;
use common_utils::error::{AuthorizationError, StateError, ContractError};
use common_utils::authorization::{IAuthorizable, RoleBasedAuth, Permission, PermissionCache, CachedAuth};
use common_utils::{permission, auth, cached_auth, check_authorization, rate_limit, rate_limit_adaptive};
use common_utils::rate_limit::{RateLimiter, TrustTier};
use common_utils::compression::{FraudReportCompressor, FraudReport};
use common_utils::storage_optimization::{CompressedReportStorage, DataSeparator, DataTemperature};
use common_utils::storage_monitoring::{StorageTracker, PerformanceMonitor};
use common_utils::data_migration::{DataMigrationManager, MigrationConfig, CompressionType};
use common_utils::state_machine::{State, StateMachine, FraudDetectState};
use common_utils::{state_guard, transition_to};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    AclContract,
    Reports(Symbol),
    ReportsMetadata(Symbol),
    MigrationState,
    ContractState,
    Reporter(Address),
}

#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub struct FraudReport {
    pub score: u32,
    pub reporter: Address,
    pub timestamp: u64,
}

#[contract]
pub struct FraudDetectContract;

impl StateMachine<FraudDetectState> for FraudDetectContract {
    fn get_state(env: &Env) -> State<FraudDetectState> {
        env.storage()
            .instance()
            .get(&DataKey::ContractState)
            .unwrap_or(State::Uninitialized)
    }

    fn set_state(env: &Env, state: State<FraudDetectState>) {
        env.storage().instance().set(&DataKey::ContractState, &state);
    }
}

#[contractimpl]
impl FraudDetectContract {
    /// Initialize the fraud detection contract with an administrator and ACL contract
    pub fn initialize(env: Env, admin: Address, acl_contract: Address) -> Result<(), StateError> {
        // Ensure contract is uninitialized
        let current_state = Self::get_state(&env);
        if !current_state.is_uninitialized() {
            return Err(StateError::AlreadyInitialized);
        }

        // Transition to Active state
        let initial_state = State::Active(FraudDetectState {
            admin: admin.clone(),
            acl_contract: acl_contract.clone(),
            total_reports: 0,
        });
        
        transition_to!(Self, &env, initial_state)?;
        
        // Store admin and ACL for backward compatibility
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::AclContract, &acl_contract);
        
        env.events().publish(
            (symbol_short!("init"),),
            (admin, acl_contract),
        );
        Ok(())
    }


    /// Add an approved reporter (ACL Managed)
    pub fn add_reporter(env: Env, caller: Address, reporter: Address) -> Result<(), AuthorizationError> {
        // State guard: contract must be active
        state_guard!(Self, &env, active);
        
        caller.require_auth();
        
        let state = Self::get_state(&env);
        let state_data = state.get_data().ok_or(AuthorizationError::NotInitialized)?;
        
        if !common_utils::check_permission(
            env.clone(),
            state_data.acl_contract.clone(),
            caller,
            symbol_short!("fraud"),
            symbol_short!("manage")
        ) {
            return Err(AuthorizationError::NotAuthorized);
        }

        env.storage().instance().set(&DataKey::Reporter(reporter.clone()), &true);
        
        env.events().publish(
            (symbol_short!("add_rpt"),),
            reporter,
        );
        
        Ok(())
    }

    /// Remove an approved reporter (Admin only)
    pub fn remove_reporter(env: Env, caller: Address, reporter: Address) -> Result<(), AuthorizationError> {
        // State guard: contract must be active
        state_guard!(Self, &env, active);
        
        caller.require_auth();
        
        let state = Self::get_state(&env);
        let state_data = state.get_data().ok_or(AuthorizationError::NotInitialized)?;
        
        if !common_utils::check_permission(
            env.clone(),
            state_data.acl_contract.clone(),
            caller,
            symbol_short!("fraud"),
            symbol_short!("manage")
        ) {
            return Err(AuthorizationError::NotAuthorized);
        }
        
        env.storage().instance().remove(&DataKey::Reporter(reporter.clone()));
        
        env.events().publish(
            (symbol_short!("rem_rpt"),),
            reporter,
        );
        
        Ok(())
    }

    /// Update fraud detection model (Admin only)
    pub fn update_model(env: Env, admin: Address, model_data: Bytes) -> Result<(), AuthorizationError> {
        // State guard: contract must be active
        state_guard!(Self, &env, active);
        
        let state = Self::get_state(&env);
        let state_data = state.get_data().ok_or(AuthorizationError::NotInitialized)?;
        
        if state_data.admin != admin {
            return Err(AuthorizationError::NotAuthorized);
        }
        admin.require_auth();

        env.events().publish(
            (symbol_short!("mdl_upd"),),
            (env.ledger().timestamp(), model_data),
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

    /// Submit a fraud score for an agent (Reporter only)
    pub fn submit_report(
        env: Env,
        reporter: Address,
        agent_id: Symbol,
        score: u32,
    ) -> Result<(), AuthorizationError> {
        // State guard: contract must be active
        state_guard!(Self, &env, active);
        // Rate limit: 10 submissions per hour per user (adaptive)
        rate_limit_adaptive!(env, reporter, "submit_rpt",
            max: 10, window: 3600,
            strategy: SlidingWindow, scope: PerUser);

        let auth = Self::get_auth(&env);
        check_authorization!(auth, &env, &reporter, permission!(Reporter));
        
        reporter.require_auth();

        let state = Self::get_state(&env);
        let state_data = state.get_data().ok_or(AuthorizationError::NotInitialized)?;

        if !common_utils::check_permission(
            env.clone(),
            state_data.acl_contract.clone(),
            reporter.clone(),
            symbol_short!("fraud"),
            symbol_short!("report")
        ) {
            return Err(AuthorizationError::NotAuthorized);
        }

        let mut reports: Vec<FraudReport> = env
            .storage()
            .instance()
            .get(&DataKey::Reports(agent_id.clone()))
            .unwrap_or(Vec::new(&env));

        // Create new report
        let report = FraudReport {
            score,
            reporter: reporter.clone(),
            timestamp: env.ledger().timestamp(),
        };

        // Add to existing reports
        let mut updated_reports = Vec::new(&env);
        for existing_report in existing_reports.iter() {
            updated_reports.push_back(existing_report.clone());
        }
        updated_reports.push_back(report);

        // Store compressed reports
        CompressedReportStorage::store_reports(&env, &agent_id, &updated_reports)?;
        
        // Update latest score for quick access
        CompressedReportStorage::update_latest_score(&env, &agent_id, score)?;
        
        // Record storage operation
        let report_size = 44; // Approximate size per report
        StorageTracker::record_operation(
            &env, 
            &symbol_short!("store"), 
            &agent_id, 
            report_size, 
            true
        );

        // Update total reports count in state
        let mut new_state_data = state_data.clone();
        new_state_data.total_reports += 1;
        Self::set_state(&env, State::Active(new_state_data));

        // Emit event
        env.events().publish(
            (symbol_short!("fraud_rpt"), agent_id),
            (reporter, score, env.ledger().timestamp()),
        );

        // End performance monitoring
        let _duration = PerformanceMonitor::end_timer(&env, &symbol_short!("submit_report"));

        Ok(())
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
    pub fn get_contract_state(env: Env) -> State<FraudDetectState> {
        Self::get_state(&env)
    }

    /// Get total reports count
    pub fn get_total_reports(env: Env) -> Result<u64, StateError> {
        state_guard!(Self, &env, initialized);
        
        let state = Self::get_state(&env);
        let state_data = state.get_data().ok_or(StateError::NotInitialized)?;
        Ok(state_data.total_reports)
    }

    /// Retrieve all fraud reports for a given agent ID
    pub fn get_reports(env: Env, agent_id: Symbol) -> Vec<FraudReport> {
        // Allow reads even when paused, but not when uninitialized or terminated
        if Self::require_initialized(&env).is_err() {
            return Vec::new(&env);
        }
        let _timer = PerformanceMonitor::start_timer(&env, &symbol_short!("get_reports"));
        
        let result = CompressedReportStorage::get_reports(&env, &agent_id)
            .unwrap_or_else(|_| Vec::new(&env));
        
        // Record access
        StorageTracker::record_operation(
            &env, 
            &symbol_short!("access"), 
            &agent_id, 
            0, 
            false
        );
        
        let _duration = PerformanceMonitor::end_timer(&env, &symbol_short!("get_reports"));
        
        result
    }

    /// Get the latest fraud score for a given agent ID
    pub fn get_latest_score(env: Env, agent_id: Symbol) -> u32 {
        let _timer = PerformanceMonitor::start_timer(&env, &symbol_short!("get_latest_score"));
        
        let result = CompressedReportStorage::get_latest_score(&env, &agent_id)
            .unwrap_or(0);
        
        // Record access
        StorageTracker::record_operation(
            &env, 
            &symbol_short!("access"), 
            &agent_id, 
            0, 
            false
        );
        
        let _duration = PerformanceMonitor::end_timer(&env, &symbol_short!("get_latest_score"));
        
        result
    }
    
    /// Get the authorization instance for this contract
    fn get_auth(env: &Env) -> CachedAuth<RoleBasedAuth> {
        let role_auth = auth!(RoleBased, 
            Symbol::new(env, "admin"), 
            Symbol::new(env, "role")
        );
        let cache = PermissionCache::new(300, Symbol::new(env, "auth_cache"));
        cached_auth!(role_auth, cache)
    }
    
    /// Check if an address has a specific role
    pub fn has_role(env: Env, address: Address, role: Permission) -> bool {
        let auth = Self::get_auth(&env);
        auth.check_permission(&env, &address, &role).unwrap_or(false)
    }
    
    /// Migrate existing data to compressed format
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
        
        // Perform migration...
        let migration_id = 1u64; // Simplified
        
        // Transition back to active after migration
        let active_state = State::Active(state_data);
        transition_to!(Self, &env, active_state)?;
        
        Ok(migration_id)
    }
}

#[contractimpl]
impl DataMigration for FraudDetectContract {
    fn export_state(env: Env) -> Vec<Val> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        let mut state = Vec::new(&env);
        state.push_back(admin.to_val());
        state
    }

    fn import_state(env: Env, data: Vec<Val>) -> Result<(), CommonError> {
        if data.len() < 1 {
            return Err(CommonError::InvalidFormat);
        }
        let val = data.get(0).unwrap();
        let admin = Address::try_from_val(&env, &val).map_err(|_| CommonError::InvalidFormat)?;
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }
}

#[cfg(test)]
mod test;
