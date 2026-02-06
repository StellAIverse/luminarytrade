//! Upgraded Example Implementation Contract (Version 2)
//! Demonstrates enhanced functionality in the upgraded version.

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CounterDataV2 {
    pub value: u64,
    pub owner: Address,
    pub max_value: u64, // New field in V2
    pub reset_count: u32, // New field in V2
}

#[contract]
pub struct ExampleImplementationV2;

#[contractimpl]
impl ExampleImplementationV2 {
    /// Initialize the contract (V2 version)
    pub fn initialize(env: Env, owner: Address, max_value: u64) {
        let data = CounterDataV2 {
            value: 0,
            owner,
            max_value,
            reset_count: 0,
        };
        env.storage().instance().set(&Symbol::new(&env, "data"), &data);
    }

    /// Increment the counter with max value check
    pub fn increment(env: Env) -> u64 {
        let mut data: CounterDataV2 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "data"))
            .expect("Not initialized");
        
        if data.value >= data.max_value {
            panic!("Counter reached maximum value");
        }
        
        data.value += 1;
        env.storage().instance().set(&Symbol::new(&env, "data"), &data);
        
        // Emit event
        env.events().publish((Symbol::new(&env, "incremented"),), data.value);
        
        data.value
    }

    /// Get current counter value
    pub fn get_value(env: Env) -> u64 {
        let data: CounterDataV2 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "data"))
            .expect("Not initialized");
        data.value
    }

    /// Reset counter (owner only) - now tracks reset count
    pub fn reset(env: Env, caller: Address) {
        let mut data: CounterDataV2 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "data"))
            .expect("Not initialized");
            
        if data.owner != caller {
            panic!("Unauthorized: only owner can reset");
        }
        
        data.value = 0;
        data.reset_count += 1;
        env.storage().instance().set(&Symbol::new(&env, "data"), &data);
        
        env.events().publish((Symbol::new(&env, "reset"),), (0u64, data.reset_count));
    }

    /// Set new maximum value (owner only)
    pub fn set_max_value(env: Env, caller: Address, new_max: u64) {
        let mut data: CounterDataV2 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "data"))
            .expect("Not initialized");
            
        if data.owner != caller {
            panic!("Unauthorized: only owner can set max value");
        }
        
        data.max_value = new_max;
        env.storage().instance().set(&Symbol::new(&env, "data"), &data);
        
        env.events().publish((Symbol::new(&env, "max_value_set"),), new_max);
    }

    /// Get maximum value
    pub fn get_max_value(env: Env) -> u64 {
        let data: CounterDataV2 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "data"))
            .expect("Not initialized");
        data.max_value
    }

    /// Get reset count
    pub fn get_reset_count(env: Env) -> u32 {
        let data: CounterDataV2 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "data"))
            .expect("Not initialized");
        data.reset_count
    }

    /// Get owner address
    pub fn get_owner(env: Env) -> Address {
        let data: CounterDataV2 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "data"))
            .expect("Not initialized");
        data.owner
    }

    /// Version information
    pub fn version(_env: Env) -> u32 {
        2 // Version 2
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    #[test]
    fn test_initialize_v2() {
        let env = Env::default();
        let owner = Address::generate(&env);
        let max_value = 100u64;
        
        ExampleImplementationV2::initialize(env.clone(), owner.clone(), max_value);
        
        assert_eq!(ExampleImplementationV2::get_owner(env.clone()), owner);
        assert_eq!(ExampleImplementationV2::get_value(Env::default()), 0);
        assert_eq!(ExampleImplementationV2::get_max_value(env), max_value);
        assert_eq!(ExampleImplementationV2::get_reset_count(Env::default()), 0);
    }

    #[test]
    fn test_increment_with_max() {
        let env = Env::default();
        let owner = Address::generate(&env);
        let max_value = 3u64;
        
        ExampleImplementationV2::initialize(env.clone(), owner, max_value);
        
        assert_eq!(ExampleImplementationV2::increment(env.clone()), 1);
        assert_eq!(ExampleImplementationV2::increment(env.clone()), 2);
        assert_eq!(ExampleImplementationV2::increment(env.clone()), 3);
        
        // Should panic on next increment
        let result = std::panic::catch_unwind(|| {
            ExampleImplementationV2::increment(env);
        });
        assert!(result.is_err());
    }

    #[test]
    fn test_reset_tracking() {
        let env = Env::default();
        let owner = Address::generate(&env);
        let max_value = 100u64;
        
        ExampleImplementationV2::initialize(env.clone(), owner.clone(), max_value);
        
        ExampleImplementationV2::increment(env.clone());
        ExampleImplementationV2::increment(env.clone());
        assert_eq!(ExampleImplementationV2::get_value(env.clone()), 2);
        assert_eq!(ExampleImplementationV2::get_reset_count(env.clone()), 0);
        
        ExampleImplementationV2::reset(env.clone(), owner.clone());
        assert_eq!(ExampleImplementationV2::get_value(env.clone()), 0);
        assert_eq!(ExampleImplementationV2::get_reset_count(env.clone()), 1);
        
        ExampleImplementationV2::reset(env.clone(), owner);
        assert_eq!(ExampleImplementationV2::get_reset_count(env), 2);
    }

    #[test]
    #[should_panic(expected = "Unauthorized")]
    fn test_set_max_value_unauthorized() {
        let env = Env::default();
        let owner = Address::generate(&env);
        let unauthorized = Address::generate(&env);
        let max_value = 100u64;
        
        ExampleImplementationV2::initialize(env.clone(), owner, max_value);
        
        ExampleImplementationV2::set_max_value(env, unauthorized, 200);
    }

    #[test]
    fn test_set_max_value_authorized() {
        let env = Env::default();
        let owner = Address::generate(&env);
        let max_value = 100u64;
        
        ExampleImplementationV2::initialize(env.clone(), owner.clone(), max_value);
        
        ExampleImplementationV2::set_max_value(env.clone(), owner, 200);
        assert_eq!(ExampleImplementationV2::get_max_value(env), 200);
    }

    #[test]
    fn test_version() {
        let env = Env::default();
        assert_eq!(ExampleImplementationV2::version(env), 2);
    }
}