//! Upgradeable Proxy Contract
//! Forwards calls to the current implementation stored in the registry.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, map, panic_with_error, vec, Address, Bytes, BytesN, Env,
    Map, String, Symbol, Val, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum ProxyError {
    RegistryNotSet = 1,
    ImplementationNotFound = 2,
    CallFailed = 3,
    UnauthorizedUpgrade = 4,
}

#[contracttype]
pub struct ProxyConfig {
    pub registry: Address,
    pub contract_name: Symbol,
    pub admin: Address,
}

#[contract]
pub struct UpgradeableProxy;

#[contractimpl]
impl UpgradeableProxy {
    /// Initialize the proxy with registry and contract name
    pub fn initialize(env: Env, registry: Address, contract_name: Symbol, admin: Address) {
        let config = ProxyConfig {
            registry,
            contract_name,
            admin,
        };
        env.storage().instance().set(&Symbol::new(&env, "config"), &config);
    }

    /// Upgrade to a new implementation
    /// Only callable by admin
    pub fn upgrade(env: Env, admin: Address, new_implementation: Address) {
        let mut config: ProxyConfig = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "config"))
            .expect("Proxy not initialized");

        // Verify admin authorization
        if config.admin != admin {
            panic_with_error!(&env, ProxyError::UnauthorizedUpgrade);
        }

        // Update the implementation in registry
        let registry_client = UpgradeRegistryClient::new(&env, &config.registry);
        let current_version = registry_client
            .get_implementation_info(&config.contract_name)
            .map(|info| info.version)
            .unwrap_or(0);

        registry_client.register_implementation(
            &admin,
            &config.contract_name,
            &new_implementation,
            &(current_version + 1),
        );

        // Emit upgrade event
        env.events().publish(
            (Symbol::new(&env, "upgraded"),),
            (
                config.contract_name,
                new_implementation,
                current_version + 1,
            ),
        );
    }

    /// Forward a call to the current implementation
    pub fn forward_call(env: Env, function: Symbol, args: Vec<Val>) -> Val {
        let config: ProxyConfig = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "config"))
            .expect("Proxy not initialized");

        // Get current implementation from registry
        let registry_client = UpgradeRegistryClient::new(&env, &config.registry);
        let implementation = registry_client
            .get_implementation(&config.contract_name)
            .unwrap_or_else(|| panic_with_error!(&env, ProxyError::ImplementationNotFound));

        // Forward the call to implementation
        env.invoke_contract(&implementation, &function, args)
    }

    /// Get current implementation address
    pub fn get_implementation(env: Env) -> Address {
        let config: ProxyConfig = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "config"))
            .expect("Proxy not initialized");

        let registry_client = UpgradeRegistryClient::new(&env, &config.registry);
        registry_client
            .get_implementation(&config.contract_name)
            .unwrap_or_else(|| panic_with_error!(&env, ProxyError::ImplementationNotFound))
    }

    /// Get proxy configuration
    pub fn get_config(env: Env) -> ProxyConfig {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "config"))
            .expect("Proxy not initialized")
    }

    /// Get admin address
    pub fn get_admin(env: Env) -> Address {
        let config: ProxyConfig = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "config"))
            .expect("Proxy not initialized");
        config.admin
    }
}

// Client for interacting with the registry
pub struct UpgradeRegistryClient<'a> {
    env: &'a Env,
    address: &'a Address,
}

impl<'a> UpgradeRegistryClient<'a> {
    pub fn new(env: &'a Env, address: &'a Address) -> Self {
        Self { env, address }
    }

    pub fn register_implementation(
        &self,
        admin: &Address,
        contract_name: &Symbol,
        implementation: &Address,
        version: &u32,
    ) {
        let args = vec![
            self.env,
            (*admin).into(),
            (*contract_name).into(),
            (*implementation).into(),
            (*version).into(),
        ];
        self.env
            .invoke_contract(self.address, &Symbol::new(self.env, "register_implementation"), args);
    }

    pub fn get_implementation(&self, contract_name: &Symbol) -> Option<Address> {
        let args = vec![self.env, (*contract_name).into()];
        let result: Option<Address> = self.env.invoke_contract(
            self.address,
            &Symbol::new(self.env, "get_implementation"),
            args,
        );
        result
    }

    pub fn get_implementation_info(
        &self,
        contract_name: &Symbol,
    ) -> Option<crate::upgrade_registry::ImplementationInfo> {
        let args = vec![self.env, (*contract_name).into()];
        let result: Option<crate::upgrade_registry::ImplementationInfo> = self.env.invoke_contract(
            self.address,
            &Symbol::new(self.env, "get_implementation_info"),
            args,
        );
        result
    }
}

// Convenience methods for common contract calls
impl UpgradeableProxy {
    /// Convenience method for calling functions that return specific types
    pub fn call_function<T>(env: Env, function: Symbol, args: Vec<Val>) -> T
    where
        T: soroban_sdk::TryFromVal<Env, Val>,
    {
        let result = Self::forward_call(env, function, args);
        T::try_from_val(&Env::default(), &result).unwrap_or_else(|_| {
            panic!("Failed to convert result");
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::upgrade_registry::{ImplementationInfo, UpgradeRegistry};
    use soroban_sdk::{testutils::Address as _, vec, Address, Env, Symbol, Val};

    #[test]
    fn test_initialize_proxy() {
        let env = Env::default();
        let registry = Address::generate(&env);
        let admin = Address::generate(&env);
        let contract_name = Symbol::new(&env, "test_contract");

        UpgradeableProxy::initialize(env.clone(), registry.clone(), contract_name.clone(), admin.clone());

        let config = UpgradeableProxy::get_config(env);
        assert_eq!(config.registry, registry);
        assert_eq!(config.contract_name, contract_name);
        assert_eq!(config.admin, admin);
    }

    #[test]
    #[should_panic(expected = "UnauthorizedUpgrade")]
    fn test_upgrade_unauthorized() {
        let env = Env::default();
        let registry = Address::generate(&env);
        let admin = Address::generate(&env);
        let unauthorized = Address::generate(&env);
        let contract_name = Symbol::new(&env, "test_contract");

        UpgradeableProxy::initialize(env.clone(), registry, contract_name, admin);

        UpgradeableProxy::upgrade(env, unauthorized, Address::generate(&env));
    }

    #[test]
    fn test_forward_call() {
        // This test would require mocking the registry and implementation contracts
        // In a real scenario, you'd deploy mock contracts for testing
    }
}