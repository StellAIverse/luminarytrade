//! Example Implementation Contract
//! Demonstrates a contract that can be managed through the upgrade mechanism.

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CounterData {
    pub value: u64,
    pub owner: Address,
}

#[contract]
pub struct ExampleImplementation;

#[contractimpl]
impl ExampleImplementation {
    /// Initialize the contract
    pub fn initialize(env: Env, owner: Address) {
        let data = CounterData {
            value: 0,
            owner,
        };
        env.storage().instance().set(&Symbol::new(&env, "data"), &data);
    }

    /// Increment the counter
    pub fn increment(env: Env) -> u64 {
        let mut data: CounterData = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "data"))
            .expect("Not initialized");
        
        data.value += 1;
        env.storage().instance().set(&Symbol::new(&env, "data"), &data);
        
        // Emit event
        env.events().publish((Symbol::new(&env, "incremented"),), data.value);
        
        data.value
    }

    /// Get current counter value
    pub fn get_value(env: Env) -> u64 {
        let data: CounterData = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "data"))
            .expect("Not initialized");
        data.value
    }

    /// Reset counter (owner only)
    pub fn reset(env: Env, caller: Address) {
        let mut data: CounterData = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "data"))
            .expect("Not initialized");
            
        if data.owner != caller {
            panic!("Unauthorized: only owner can reset");
        }
        
        data.value = 0;
        env.storage().instance().set(&Symbol::new(&env, "data"), &data);
        
        env.events().publish((Symbol::new(&env, "reset"),), 0u64);
    }

    /// Get owner address
    pub fn get_owner(env: Env) -> Address {
        let data: CounterData = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "data"))
            .expect("Not initialized");
        data.owner
    }

    /// Version information
    pub fn version(_env: Env) -> u32 {
        1 // Version 1
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let owner = Address::generate(&env);
        
        ExampleImplementation::initialize(env.clone(), owner.clone());
        
        assert_eq!(ExampleImplementation::get_owner(env), owner);
        assert_eq!(ExampleImplementation::get_value(Env::default()), 0);
    }

    #[test]
    fn test_increment() {
        let env = Env::default();
        let owner = Address::generate(&env);
        
        ExampleImplementation::initialize(env.clone(), owner);
        
        assert_eq!(ExampleImplementation::increment(env.clone()), 1);
        assert_eq!(ExampleImplementation::increment(env.clone()), 2);
        assert_eq!(ExampleImplementation::get_value(env), 2);
    }

    #[test]
    #[should_panic(expected = "Unauthorized")]
    fn test_reset_unauthorized() {
        let env = Env::default();
        let owner = Address::generate(&env);
        let unauthorized = Address::generate(&env);
        
        ExampleImplementation::initialize(env.clone(), owner);
        
        ExampleImplementation::reset(env, unauthorized);
    }

    #[test]
    fn test_reset_authorized() {
        let env = Env::default();
        let owner = Address::generate(&env);
        
        ExampleImplementation::initialize(env.clone(), owner.clone());
        ExampleImplementation::increment(env.clone());
        assert_eq!(ExampleImplementation::get_value(env.clone()), 1);
        
        ExampleImplementation::reset(env.clone(), owner);
        assert_eq!(ExampleImplementation::get_value(env), 0);
    }

    #[test]
    fn test_version() {
        let env = Env::default();
        assert_eq!(ExampleImplementation::version(env), 1);
    }
}