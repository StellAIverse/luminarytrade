pub mod oracle_bridge;

use soroban_sdk::{contracttype, Address, BytesN};

#[contracttype]
pub enum DataKey {
    Admin,
    TrustedBridge,
    AgentLevel(Address),
    AgentStake(Address),
    UsedAttestation(BytesN<32>),
}

#[contracttype]
#[derive(Clone)]
pub struct Attestation {
    pub agent: Address,
    pub new_level: u32,
    pub stake_amount: i128,
    pub attestation_hash: BytesN<32>, // unique ID / replay protection
}


use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct EvolutionManager;

#[contractimpl]
impl EvolutionManager {
    pub fn emit_evolution_completed(
        env: Env,
        agent: Address,
        new_level: u32,
        total_stake: i128,
        attestation_hash: BytesN<32>,
    ) {
        env.events().publish(
            ("EvolutionCompleted",),
            (agent, new_level, total_stake, attestation_hash),
        );
    }
}


use soroban_sdk::{
    contract, contractimpl, panic_with_error, symbol, Address, Env, Map, Storage, Vec, IntoVal,
    log, events,
};

/// Errors for the CommonUtils contract.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Error {
    /// Action type not valid.
    InvalidActionType = 1,
    /// Execution ID already exists.
    ExecutionIdExists = 2,
    /// Rate limit exceeded for agent.
    RateLimitExceeded = 3,
    /// Only admin can perform this action.
    Unauthorized = 4,
}

impl soroban_sdk::contracterror::ContractError for Error {
    fn as_u32(&self) -> u32 {
        *self as u32
    }
}

/// Action types supported by the contract.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ActionType {
    CreditScore = 1,
    FraudDetect = 2,
    Trade = 3,
}

impl ActionType {
    pub fn from_u32(value: u32) -> Option<Self> {
        match value {
            1 => Some(ActionType::CreditScore),
            2 => Some(ActionType::FraudDetect),
            3 => Some(ActionType::Trade),
            _ => None,
        }
    }
}

/// Execution record.
#[derive(Clone)]
pub struct Execution {
    pub id: u64,
    pub agent: Address,
    pub action_type: ActionType,
    pub data: Vec<u8>,
    pub timestamp: u64,
}

/// Main contract struct
#[contract]
pub struct CommonUtilsContract;

const KEY_ADMIN: &str = "admin";
const KEY_EXECUTION_COUNTER: &str = "execution_counter";
const PREFIX_EXECUTION: &str = "execution";
const PREFIX_AGENT_RATE_LIMIT: &str = "rate_limit";
const RATE_LIMIT_WINDOW: u64 = 3600; // 1 hour in seconds
const RATE_LIMIT_MAX: u32 = 10; // max actions per window

#[contractimpl]
impl CommonUtilsContract {
    /// Initialize contract with admin set to caller.
    pub fn initialize(env: Env) {
        let admin = env.invoker();
        env.storage().persistent().set(&symbol!(KEY_ADMIN), &admin);
        env.storage().persistent().set(&symbol!(KEY_EXECUTION_COUNTER), &0u64);
    }

    /// Submit an agent action.
    /// Validates action type, enforces rate limits, records execution, emits event.
    pub fn submit_action(env: Env, agent: Address, action_type: u32, data: Vec<u8>) -> u64 {
        // Validate action type
        let action = ActionType::from_u32(action_type).unwrap_or_else(|| {
            panic_with_error!(&env, Error::InvalidActionType);
        });

        // Check rate limit
        Self::check_rate_limit(&env, &agent);

        // Generate unique execution ID
        let counter = env.storage().persistent().get::<_, u64>(&symbol!(KEY_EXECUTION_COUNTER)).unwrap_or(0);
        let execution_id = counter + 1;

        // Check uniqueness (though counter ensures it)
        let execution_key = (symbol!(PREFIX_EXECUTION), execution_id);
        if env.storage().persistent().has(&execution_key) {
            panic_with_error!(&env, Error::ExecutionIdExists);
        }

        // Create execution record
        let timestamp = env.ledger().timestamp();
        let execution = Execution {
            id: execution_id,
            agent: agent.clone(),
            action_type: action,
            data,
            timestamp,
        };

        // Store execution
        env.storage().persistent().set(&execution_key, &execution);
        env.storage().persistent().set(&symbol!(KEY_EXECUTION_COUNTER), &execution_id);

        // Update rate limit
        Self::update_rate_limit(&env, &agent, timestamp);

        // Emit event
        env.events().publish((symbol!("action_submitted"),), (execution_id, agent, action_type, timestamp));

        execution_id
    }

    /// Get execution by ID.
    pub fn get_execution(env: Env, execution_id: u64) -> Option<Execution> {
        let key = (symbol!(PREFIX_EXECUTION), execution_id);
        env.storage().persistent().get(&key)
    }

    /// Get admin address.
    pub fn admin(env: Env) -> Address {
        env.storage().persistent().get_unchecked(&symbol!(KEY_ADMIN))
    }

    /// Check if agent has exceeded rate limit.
    fn check_rate_limit(env: &Env, agent: &Address) {
        let now = env.ledger().timestamp();
        let window_start = now.saturating_sub(RATE_LIMIT_WINDOW);
        let key = (symbol!(PREFIX_AGENT_RATE_LIMIT), agent.clone());
        
        let actions: Vec<u64> = env.storage().temporary().get(&key).unwrap_or(Vec::new(env));
        let recent_actions: Vec<u64> = actions.iter().filter(|&t| *t >= window_start).collect();
        
        if recent_actions.len() >= RATE_LIMIT_MAX as usize {
            panic_with_error!(env, Error::RateLimitExceeded);
        }
    }

    /// Update rate limit for agent.
    fn update_rate_limit(env: &Env, agent: &Address, timestamp: u64) {
        let key = (symbol!(PREFIX_AGENT_RATE_LIMIT), agent.clone());
        let mut actions: Vec<u64> = env.storage().temporary().get(&key).unwrap_or(Vec::new(env));
        actions.push_back(timestamp);
        env.storage().temporary().set(&key, &actions);
    }
    
}

#[contractimpl]
impl EvolutionManager {
    pub fn apply_attestation(env: Env, attestation: Attestation, signature: BytesN<64>) {
        // 1. Check attestation not replayed
        if env.storage().has(&DataKey::UsedAttestation(attestation.attestation_hash.clone())) {
            panic!("Attestation already used");
        }

        // 2. Verify signature from trusted bridge
        let bridge: Address = env
            .storage()
            .get(&DataKey::TrustedBridge)
            .expect("Trusted bridge not set")
            .unwrap();

        // TODO: implement verify_sig call using bridge and attestation
        // env.verify_sig(attestation_serialized, signature, bridge);

        // 3. Update agent stake
        let prev_stake: i128 = env.storage().get(&DataKey::AgentStake(attestation.agent.clone())).unwrap_or(0);
        env.storage().set(
            &DataKey::AgentStake(attestation.agent.clone()),
            &(prev_stake + attestation.stake_amount),
        );

        // 4. Update evolution level
        env.storage().set(&DataKey::AgentLevel(attestation.agent.clone()), &attestation.new_level);

        // 5. Mark attestation as used
        env.storage().set(&DataKey::UsedAttestation(attestation.attestation_hash.clone()), &true);

        // 6. Emit event
        Self::emit_evolution_completed(
            env,
            attestation.agent,
            attestation.new_level,
            prev_stake + attestation.stake_amount,
            attestation.attestation_hash,
        );
    }
}



#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Env as TestEnv, Address, Vec};

    #[test]
    fn test_initialize() {
        let env = TestEnv::default();
        let contract_id = env.register_contract(None, CommonUtilsContract);
        let client = CommonUtilsContractClient::new(&env, &contract_id);
        client.initialize();
        let admin = client.admin();
        assert_eq!(admin, env.invoker());
    }

    #[test]
    fn test_submit_action_valid() {
        let env = TestEnv::default();
        let contract_id = env.register_contract(None, CommonUtilsContract);
        let client = CommonUtilsContractClient::new(&env, &contract_id);
        client.initialize();
        
        let agent = Address::random(&env);
        let data = Vec::new(&env);
        let execution_id = client.submit_action(&agent, &1u32, &data);
        assert_eq!(execution_id, 1);
        
        let execution = client.get_execution(&execution_id).unwrap();
        assert_eq!(execution.id, 1);
        assert_eq!(execution.agent, agent);
        assert_eq!(execution.action_type as u32, 1);
    }

    #[test]
    fn test_submit_action_invalid_type() {
        let env = TestEnv::default();
        let contract_id = env.register_contract(None, CommonUtilsContract);
        let client = CommonUtilsContractClient::new(&env, &contract_id);
        client.initialize();
        
        let agent = Address::random(&env);
        let data = Vec::new(&env);
        let result = std::panic::catch_unwind(|| {
            client.submit_action(&agent, &99u32, &data);
        });
        assert!(result.is_err());
    }

    #[test]
    fn test_execution_id_unique() {
        let env = TestEnv::default();
        let contract_id = env.register_contract(None, CommonUtilsContract);
        let client = CommonUtilsContractClient::new(&env, &contract_id);
        client.initialize();
        
        let agent = Address::random(&env);
        let data = Vec::new(&env);
        let id1 = client.submit_action(&agent, &1u32, &data);
        let id2 = client.submit_action(&agent, &2u32, &data);
        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
    }

    #[test]
    fn test_rate_limit() {
        let env = TestEnv::default();
        let contract_id = env.register_contract(None, CommonUtilsContract);
        let client = CommonUtilsContractClient::new(&env, &contract_id);
        client.initialize();
        
        let agent = Address::random(&env);
        let data = Vec::new(&env);
        
        // Submit max actions
        for _ in 0..RATE_LIMIT_MAX {
            client.submit_action(&agent, &1u32, &data);
        }
        
        // Next should fail
        let result = std::panic::catch_unwind(|| {
            client.submit_action(&agent, &1u32, &data);
        });
        assert!(result.is_err());
    }

   

    #[test]
    fn test_init() {
        let env = Env::default();
        let admin = Address::random(&env);
        EvolutionManager::init(env.clone(), admin.clone());
        let stored_admin: Address = env.storage().get(&DataKey::Admin).unwrap().unwrap();
        assert_eq!(stored_admin, admin);
    }


}
