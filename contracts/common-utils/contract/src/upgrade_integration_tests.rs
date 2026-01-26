//! Integration tests for the upgrade mechanism
//! Tests the complete workflow of deploying registry, proxy, and upgrading implementations.

#![cfg(test)]

use crate::{
    example_impl::ExampleImplementation, example_impl_v2::ExampleImplementationV2,
    upgrade_proxy::UpgradeableProxy, upgrade_registry::UpgradeRegistry,
};
use soroban_sdk::{
    testutils::{Address as _, Events},
    vec, Address, Env, Symbol, Val,
};

#[test]
fn test_complete_upgrade_workflow() {
    let env = Env::default();
    
    // Generate addresses
    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let contract_name = Symbol::new(&env, "counter_contract");
    
    // 1. Deploy registry
    let registry_address = env.register_contract(None, UpgradeRegistry);
    UpgradeRegistry::initialize(env.clone(), admin.clone());
    
    // 2. Deploy initial implementation
    let impl_v1_address = env.register_contract(None, ExampleImplementation);
    ExampleImplementation::initialize(env.clone(), owner.clone());
    
    // 3. Register implementation in registry
    UpgradeRegistry::register_implementation(
        env.clone(),
        admin.clone(),
        contract_name.clone(),
        impl_v1_address.clone(),
        1,
    );
    
    // 4. Deploy proxy
    let proxy_address = env.register_contract(None, UpgradeableProxy);
    UpgradeableProxy::initialize(
        env.clone(),
        registry_address.clone(),
        contract_name.clone(),
        admin.clone(),
    );
    
    // 5. Test V1 functionality through proxy
    let increment_fn = Symbol::new(&env, "increment");
    let get_value_fn = Symbol::new(&env, "get_value");
    let reset_fn = Symbol::new(&env, "reset");
    let version_fn = Symbol::new(&env, "version");
    
    // Test increment through proxy
    let args = vec![&env];
    let result: u64 = env.invoke_contract(&proxy_address, &increment_fn, args.clone());
    assert_eq!(result, 1);
    
    // Test get_value through proxy
    let result: u64 = env.invoke_contract(&proxy_address, &get_value_fn, args.clone());
    assert_eq!(result, 1);
    
    // Test version through proxy
    let result: u32 = env.invoke_contract(&proxy_address, &version_fn, args.clone());
    assert_eq!(result, 1);
    
    // 6. Deploy V2 implementation
    let impl_v2_address = env.register_contract(None, ExampleImplementationV2);
    // Initialize V2 with max value of 10
    let init_args = vec![&env, owner.clone().into(), 10u64.into()];
    env.invoke_contract::<()>(&impl_v2_address, &Symbol::new(&env, "initialize"), init_args);
    
    // 7. Upgrade through proxy
    let upgrade_args = vec![&env, admin.clone().into(), impl_v2_address.clone().into()];
    env.invoke_contract::<()>(&proxy_address, &Symbol::new(&env, "upgrade"), upgrade_args);
    
    // 8. Verify upgrade worked by checking new version
    let result: u32 = env.invoke_contract(&proxy_address, &version_fn, args.clone());
    assert_eq!(result, 2); // Should now be version 2
    
    // 9. Test V2 enhanced functionality
    // Test increment with max value constraint
    for i in 2..=10 {
        let result: u64 = env.invoke_contract(&proxy_address, &increment_fn, args.clone());
        assert_eq!(result, i);
    }
    
    // Next increment should fail (hit max value)
    let result = std::panic::catch_unwind(|| {
        env.invoke_contract::<u64>(&proxy_address, &increment_fn, args.clone());
    });
    assert!(result.is_err());
    
    // Test reset functionality (now tracks count)
    let reset_args = vec![&env, owner.clone().into()];
    env.invoke_contract::<()>(&proxy_address, &reset_fn, reset_args);
    
    // Check value is reset
    let result: u64 = env.invoke_contract(&proxy_address, &get_value_fn, args.clone());
    assert_eq!(result, 0);
    
    // Test that we can still access the registry directly
    assert_eq!(
        UpgradeRegistry::get_implementation(env.clone(), contract_name.clone()),
        Some(impl_v2_address)
    );
    
    let info = UpgradeRegistry::get_implementation_info(env, contract_name).unwrap();
    assert_eq!(info.implementation, impl_v2_address);
    assert_eq!(info.version, 2);
}

#[test]
fn test_upgrade_events() {
    let env = Env::default();
    
    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let contract_name = Symbol::new(&env, "test_contract");
    
    // Setup
    let registry_address = env.register_contract(None, UpgradeRegistry);
    UpgradeRegistry::initialize(env.clone(), admin.clone());
    
    let impl_v1_address = env.register_contract(None, ExampleImplementation);
    ExampleImplementation::initialize(env.clone(), owner);
    
    UpgradeRegistry::register_implementation(
        env.clone(),
        admin.clone(),
        contract_name.clone(),
        impl_v1_address,
        1,
    );
    
    let proxy_address = env.register_contract(None, UpgradeableProxy);
    UpgradeableProxy::initialize(
        env.clone(),
        registry_address,
        contract_name.clone(),
        admin.clone(),
    );
    
    // Deploy V2
    let impl_v2_address = env.register_contract(None, ExampleImplementationV2);
    
    // Capture events before upgrade
    let events_before = env.events().all();
    
    // Perform upgrade
    let upgrade_args = vec![&env, admin.into(), impl_v2_address.clone().into()];
    env.invoke_contract::<()>(&proxy_address, &Symbol::new(&env, "upgrade"), upgrade_args);
    
    // Check events
    let events_after = env.events().all();
    let new_events = &events_after[events_before.len()..];
    
    // Should have upgrade event
    assert!(!new_events.is_empty());
    
    // Check that registry was updated
    assert_eq!(
        UpgradeRegistry::get_implementation(env, contract_name),
        Some(impl_v2_address)
    );
}

#[test]
#[should_panic(expected = "UnauthorizedUpgrade")]
fn test_upgrade_unauthorized_fails() {
    let env = Env::default();
    
    let admin = Address::generate(&env);
    let unauthorized = Address::generate(&env);
    let owner = Address::generate(&env);
    let contract_name = Symbol::new(&env, "test_contract");
    
    // Setup
    let registry_address = env.register_contract(None, UpgradeRegistry);
    UpgradeRegistry::initialize(env.clone(), admin.clone());
    
    let impl_v1_address = env.register_contract(None, ExampleImplementation);
    ExampleImplementation::initialize(env.clone(), owner);
    
    UpgradeRegistry::register_implementation(
        env.clone(),
        admin,
        contract_name.clone(),
        impl_v1_address,
        1,
    );
    
    let proxy_address = env.register_contract(None, UpgradeableProxy);
    UpgradeableProxy::initialize(
        env.clone(),
        registry_address,
        contract_name,
        admin,
    );
    
    // Try to upgrade with unauthorized user
    let impl_v2_address = env.register_contract(None, ExampleImplementationV2);
    let upgrade_args = vec![&env, unauthorized.into(), impl_v2_address.into()];
    env.invoke_contract::<()>(&proxy_address, &Symbol::new(&env, "upgrade"), upgrade_args);
}

#[test]
fn test_multiple_contracts_same_registry() {
    let env = Env::default();
    
    let admin = Address::generate(&env);
    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);
    
    // Deploy registry
    let registry_address = env.register_contract(None, UpgradeRegistry);
    UpgradeRegistry::initialize(env.clone(), admin.clone());
    
    // Contract 1
    let contract_name1 = Symbol::new(&env, "contract1");
    let impl_v1_addr1 = env.register_contract(None, ExampleImplementation);
    ExampleImplementation::initialize(env.clone(), owner1.clone());
    
    UpgradeRegistry::register_implementation(
        env.clone(),
        admin.clone(),
        contract_name1.clone(),
        impl_v1_addr1,
        1,
    );
    
    let proxy_addr1 = env.register_contract(None, UpgradeableProxy);
    UpgradeableProxy::initialize(
        env.clone(),
        registry_address.clone(),
        contract_name1,
        admin.clone(),
    );
    
    // Contract 2
    let contract_name2 = Symbol::new(&env, "contract2");
    let impl_v1_addr2 = env.register_contract(None, ExampleImplementation);
    ExampleImplementation::initialize(env.clone(), owner2.clone());
    
    UpgradeRegistry::register_implementation(
        env.clone(),
        admin.clone(),
        contract_name2.clone(),
        impl_v1_addr2,
        1,
    );
    
    let proxy_addr2 = env.register_contract(None, UpgradeableProxy);
    UpgradeableProxy::initialize(
        env.clone(),
        registry_address,
        contract_name2,
        admin,
    );
    
    // Test both contracts work independently
    let increment_fn = Symbol::new(&env, "increment");
    let args = vec![&env];
    
    let result1: u64 = env.invoke_contract(&proxy_addr1, &increment_fn, args.clone());
    let result2: u64 = env.invoke_contract(&proxy_addr2, &increment_fn, args);
    
    assert_eq!(result1, 1);
    assert_eq!(result2, 1);
}