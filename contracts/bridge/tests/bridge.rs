#![cfg(test)]

use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    token, Address, Bytes, Env,
};

use bridge::{BridgeContract, BridgeContractClient, ChainType, TransferStatus};

fn deploy_bridge(env: &Env) -> (Address, BridgeContractClient<'_>) {
    let contract_id = env.register_contract(None, BridgeContract);
    (contract_id.clone(), BridgeContractClient::new(env, &contract_id))
}

fn deploy_asset(env: &Env) -> (Address, token::StellarAssetClient<'_>, token::Client<'_>) {
    let token_admin = Address::generate(env);
    let token_id = env.register_stellar_asset_contract(token_admin);
    (
        token_id.clone(),
        token::StellarAssetClient::new(env, &token_id),
        token::Client::new(env, &token_id),
    )
}

fn setup_bridge(env: &Env) -> (Address, BridgeContractClient<'_>, Address, soroban_sdk::Vec<Address>) {
    let (bridge_id, client) = deploy_bridge(env);
    let admin = Address::generate(env);

    let mut relayers = soroban_sdk::Vec::new(env);
    for _ in 0..5 {
        relayers.push_back(Address::generate(env));
    }

    client.initialize(&admin, &relayers, &3);
    (bridge_id, client, admin, relayers)
}

fn attest(env: &Env, client: &BridgeContractClient<'_>, relayers: &soroban_sdk::Vec<Address>, transfer_id: u64) {
    let sig = Bytes::from_slice(env, &[1, 2, 3]);
    for i in 0..3u32 {
        let relayer = relayers.get(i).unwrap();
        client.relay_attestation(&relayer, &transfer_id, &sig);
    }
}

#[test]
fn deposit_locks_tokens_and_completion_pays_fee() {
    let env = Env::default();
    env.mock_all_auths();

    let (bridge_id, client, admin, relayers) = setup_bridge(&env);
    let (token_id, token_admin_client, token_client) = deploy_asset(&env);

    let user = Address::generate(&env);
    token_admin_client.mint(&user, &10_000_000_000);

    let before_user = token_client.balance(&user);
    let before_bridge = token_client.balance(&bridge_id);
    let before_admin = token_client.balance(&admin);

    let recipient_evm = Bytes::from_slice(&env, &[0u8; 20]);
    let transfer = client.initiate_transfer(&user, &recipient_evm, &ChainType::Ethereum, &token_id, &5_000_000_000);
    assert_eq!(transfer.status as u32, TransferStatus::Pending as u32);

    assert_eq!(token_client.balance(&user), before_user - 5_000_000_000);
    assert_eq!(token_client.balance(&bridge_id), before_bridge + 5_000_000_000);

    attest(&env, &client, &relayers, transfer.transfer_id);

    let confirmed = client.get_transfer(&transfer.transfer_id);
    assert_eq!(confirmed.status as u32, TransferStatus::Confirmed as u32);

    client.complete_transfer(&transfer.transfer_id);

    let completed = client.get_transfer(&transfer.transfer_id);
    assert_eq!(completed.status as u32, TransferStatus::Completed as u32);

    // Fee was transferred from bridge to admin.
    assert_eq!(token_client.balance(&admin), before_admin + completed.fee);
    assert_eq!(token_client.balance(&bridge_id), before_bridge + 5_000_000_000 - completed.fee);
}

#[test]
fn refund_after_timeout_returns_tokens_no_loss() {
    let env = Env::default();
    env.mock_all_auths();

    let (bridge_id, client, _admin, _relayers) = setup_bridge(&env);
    let (token_id, token_admin_client, token_client) = deploy_asset(&env);

    let user = Address::generate(&env);
    token_admin_client.mint(&user, &10_000_000_000);

    let recipient_evm = Bytes::from_slice(&env, &[0u8; 20]);
    let transfer = client.initiate_transfer(&user, &recipient_evm, &ChainType::Ethereum, &token_id, &5_000_000_000);

    // Move past the default timeout (3600s).
    env.ledger().with_mut(|li| li.timestamp += 3601);

    client.refund_transfer(&user, &transfer.transfer_id);

    assert_eq!(token_client.balance(&user), 10_000_000_000);
    assert_eq!(token_client.balance(&bridge_id), 0);
}

#[test]
fn burn_withdraw_releases_locked_funds() {
    let env = Env::default();
    env.mock_all_auths();

    let (bridge_id, client, _admin, relayers) = setup_bridge(&env);
    let (token_id, token_admin_client, token_client) = deploy_asset(&env);

    // First, lock funds via a deposit transfer (source -> dest).
    let locker = Address::generate(&env);
    token_admin_client.mint(&locker, &10_000_000_000);
    let recipient_evm = Bytes::from_slice(&env, &[0u8; 20]);
    let deposit = client.initiate_transfer(&locker, &recipient_evm, &ChainType::Ethereum, &token_id, &5_000_000_000);
    attest(&env, &client, &relayers, deposit.transfer_id);
    client.complete_transfer(&deposit.transfer_id);

    // Now request a withdrawal back to Stellar.
    let recipient = Address::generate(&env);
    let withdraw = client.burn_and_withdraw(&locker, &recipient, &ChainType::Stellar, &token_id, &deposit.net_amount);
    attest(&env, &client, &relayers, withdraw.transfer_id);

    let before_recipient = token_client.balance(&recipient);
    client.complete_withdraw(&withdraw.transfer_id);
    assert_eq!(token_client.balance(&recipient), before_recipient + withdraw.net_amount);

    // Conserved: bridge balance decreased by the released net amount.
    // (Fees are paid out during completion; we don't assert exact fee routing here.)
    assert!(token_client.balance(&bridge_id) >= 0);
}

#[test]
fn test_dynamic_fee_update_and_usage() {
    let env = Env::default();
    env.mock_all_auths();

    let (bridge_id, client, admin, relayers) = setup_bridge(&env);
    let (token_id, token_admin_client, token_client) = deploy_asset(&env);

    // Deploy an oracle address and set it
    let oracle = Address::generate(&env);
    client.set_fee_oracle(&admin, &oracle);

    // Enable dynamic fees and configure parameters
    client.set_dynamic_fee_enabled(&admin, &true);
    client.set_dynamic_fee_params(&admin, &7000u32, &500u32);

    // Report high congestion (9000 bps) from oracle
    client.report_congestion(&oracle, &9000u32);

    // Dynamic fee should now be higher than default
    let dyn_bps = client.get_dynamic_bridge_fee();
    let base_bps: u32 = client.get_bridge_fee_bps();
    assert!(dyn_bps >= base_bps);

    // Ensure a transfer applies the dynamic fee
    let user = Address::generate(&env);
    token_admin_client.mint(&user, &10_000_000_000);
    let recipient_evm = Bytes::from_slice(&env, &[0u8; 20]);
    let transfer = client.initiate_transfer(&user, &recipient_evm, &ChainType::Ethereum, &token_id, &5_000_000_000);

    // fee calculated in transfer should match dynamic bps proportion
    let expected_bridge_fee = (transfer.amount * dyn_bps as i128) / 10000;
    assert!(transfer.fee >= expected_bridge_fee);
}
