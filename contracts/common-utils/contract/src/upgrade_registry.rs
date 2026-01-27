//! Upgrade Registry Contract
//! Manages the mapping between contract names and their current implementation addresses.

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ImplementationInfo {
    pub implementation: Address,
    pub version: u32,
    pub deployed_at: u64,
}

#[contract]
pub struct UpgradeRegistry;

#[contractimpl]
impl UpgradeRegistry {
    /// Initialize the registry with admin address
    pub fn initialize(env: Env, admin: Address) {
        env.storage().instance().set(&Symbol::new(&env, "admin"), &admin);
    }

    /// Register a new implementation for a contract
    pub fn register_implementation(
        env: Env,
        admin: Address,
        contract_name: Symbol,
        implementation: Address,
        version: u32,
    ) {
        // Verify admin authorization
        if env.storage().instance().get::<_, Address>(&Symbol::new(&env, "admin")) != Some(admin) {
            panic!("Unauthorized: only admin can register implementations");
        }

        // Store the implementation info
        let info = ImplementationInfo {
            implementation,
            version,
            deployed_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&contract_name, &info);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "registered_impl"),),
            (contract_name, implementation, version),
        );
    }

    /// Get current implementation for a contract
    pub fn get_implementation(env: Env, contract_name: Symbol) -> Option<Address> {
        env.storage()
            .persistent()
            .get::<_, ImplementationInfo>(&contract_name)
            .map(|info| info.implementation)
    }

    /// Get implementation info for a contract
    pub fn get_implementation_info(env: Env, contract_name: Symbol) -> Option<ImplementationInfo> {
        env.storage()
            .persistent()
            .get(&contract_name)
    }

    /// Check if a contract has a registered implementation
    pub fn has_implementation(env: Env, contract_name: Symbol) -> bool {
        env.storage()
            .persistent()
            .has(&contract_name)
    }

    /// Get admin address
    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "admin"))
            .expect("Admin not initialized")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env, Symbol};

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let admin = Address::generate(&env);
        
        UpgradeRegistry::initialize(env.clone(), admin.clone());
        
        assert_eq!(UpgradeRegistry::get_admin(env), admin);
    }

    #[test]
    #[should_panic(expected = "Unauthorized")]
    fn test_register_unauthorized() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let unauthorized = Address::generate(&env);
        let impl_address = Address::generate(&env);
        
        UpgradeRegistry::initialize(env.clone(), admin);
        
        UpgradeRegistry::register_implementation(
            env,
            unauthorized,
            Symbol::new(&env, "test_contract"),
            impl_address,
            1,
        );
    }

    #[test]
    fn test_register_and_get_implementation() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let impl_address = Address::generate(&env);
        let contract_name = Symbol::new(&env, "test_contract");
        
        UpgradeRegistry::initialize(env.clone(), admin.clone());
        
        UpgradeRegistry::register_implementation(
            env.clone(),
            admin,
            contract_name.clone(),
            impl_address.clone(),
            1,
        );
        
        assert_eq!(
            UpgradeRegistry::get_implementation(env.clone(), contract_name.clone()),
            Some(impl_address)
        );
        
        let info = UpgradeRegistry::get_implementation_info(env, contract_name).unwrap();
        assert_eq!(info.implementation, impl_address);
        assert_eq!(info.version, 1);
    }

    #[test]
    fn test_upgrade_implementation() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let impl_v1 = Address::generate(&env);
        let impl_v2 = Address::generate(&env);
        let contract_name = Symbol::new(&env, "test_contract");
        
        UpgradeRegistry::initialize(env.clone(), admin.clone());
        
        // Register v1
        UpgradeRegistry::register_implementation(
            env.clone(),
            admin.clone(),
            contract_name.clone(),
            impl_v1,
            1,
        );
        
        // Upgrade to v2
        UpgradeRegistry::register_implementation(
            env.clone(),
            admin,
            contract_name.clone(),
            impl_v2.clone(),
            2,
        );
        
        assert_eq!(
            UpgradeRegistry::get_implementation(env, contract_name),
            Some(impl_v2)
        );
    }
}