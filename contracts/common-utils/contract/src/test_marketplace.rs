#![cfg(test)]

use crate::marketplace::{MarketplaceContract, MarketplaceContractClient};
use crate::marketplace_types::{ListingType};
use soroban_sdk::{testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation}, Address, Env, token, Symbol, IntoVal};

#[test]
fn test_list_and_buy_happy_path() {
    let env = Env::default();
    env.mock_all_auths();

    // --- SETUP ---
    let contract_id = env.register_contract(None, MarketplaceContract);
    let client = MarketplaceContractClient::new(&env, &contract_id);

    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let creator = Address::generate(&env);

    // --- SETUP TOKENS ---
    // 1. Create the Token Admin & Contract
    let agent_token_admin = Address::generate(&env);
    let agent_token_id = env.register_stellar_asset_contract(agent_token_admin.clone());
    
    // 2. Create Two Clients:
    //    - 'token::Client' for normal stuff (balance, transfer)
    //    - 'token::StellarAssetClient' for ADMIN stuff (mint)
    let agent_token = token::Client::new(&env, &agent_token_id);
    let agent_admin_client = token::StellarAssetClient::new(&env, &agent_token_id);

    let usdc_token_admin = Address::generate(&env);
    let usdc_token_id = env.register_stellar_asset_contract(usdc_token_admin.clone());
    let usdc_token = token::Client::new(&env, &usdc_token_id);
    let usdc_admin_client = token::StellarAssetClient::new(&env, &usdc_token_id);

    // 3. Mint Initial Balances (Using the Admin Client)
    // Note: mint takes (to, amount). The 'admin' is handled by mock_all_auths().
    agent_admin_client.mint(&seller, &1);
    usdc_admin_client.mint(&buyer, &1000);

    // --- ACTION: LISTING ---
    let agent_id = 101u64;
    let price = 500i128;
    let royalty_bps = 1000u32; // 10%

    client.list_agent(
        &seller,
        &agent_id,
        &agent_token_id,
        &price,
        &usdc_token_id,
        &ListingType::Sale,
        &royalty_bps,
        &creator
    );

    // Verify Escrow
    assert_eq!(agent_token.balance(&seller), 0);
    assert_eq!(agent_token.balance(&contract_id), 1);

    // --- ACTION: BUYING ---
    client.buy_agent(&buyer, &agent_id);

    // Verify Payments
    assert_eq!(usdc_token.balance(&buyer), 500); // 1000 - 500
    assert_eq!(usdc_token.balance(&seller), 450);
    assert_eq!(usdc_token.balance(&creator), 50);

    // Verify Asset Delivery
    assert_eq!(agent_token.balance(&buyer), 1);
    assert_eq!(agent_token.balance(&contract_id), 0);
}
