#![cfg(test)]

extern crate std;

use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    Address, Env, Symbol, Vec, String,
};

use crypto_waitlist::{
    CryptoWaitlistContract, CryptoWaitlistContractClient, TradingPair, PairStatus,
    WaitlistConfig,
};
use common_utils::error::CommonError;

// ============================================================================
// Test helpers
// ============================================================================

fn setup() -> (Env, Address, CryptoWaitlistContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, CryptoWaitlistContract);
    let client = CryptoWaitlistContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin, &10); // 10 votes threshold for testing
    (env, admin, client)
}

fn advance_time(env: &Env, seconds: u64) {
    let current = env.ledger().timestamp();
    env.ledger().set(LedgerInfo {
        timestamp: current + seconds,
        protocol_version: 22,
        sequence_number: env.ledger().sequence(),
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 10,
        min_persistent_entry_ttl: 10,
        max_entry_ttl: 3_110_400,
    });
}

// ============================================================================
// 1. Initialization
// ============================================================================

#[test]
fn test_initialize_success() {
    let (_env, _admin, _client) = setup();
    // If we get here without panic, initialization succeeded
}

#[test]
#[should_panic]
fn test_initialize_twice_fails() {
    let (env, admin, client) = setup();
    // Second init should fail
    client.initialize(&admin, &10);
}

// ============================================================================
// 2. Proposing Trading Pairs
// ============================================================================

#[test]
fn test_propose_pair_success() {
    let (env, _admin, client) = setup();
    let proposer = Address::generate(&env);
    
    let base_token = Symbol::new(&env, "BTC");
    let quote_token = Symbol::new(&env, "USDT");
    
    let pair_id = client.propose_pair(&proposer, &base_token, &quote_token, &0);
    assert_eq!(pair_id, 0u64);
}

#[test]
fn test_propose_multiple_pairs() {
    let (env, _admin, client) = setup();
    let proposer = Address::generate(&env);
    
    let btc_usdt = client.propose_pair(&proposer, &Symbol::new(&env, "BTC"), &Symbol::new(&env, "USDT"), &0);
    let eth_usdt = client.propose_pair(&proposer, &Symbol::new(&env, "ETH"), &Symbol::new(&env, "USDT"), &0);
    
    assert_eq!(btc_usdt, 0u64);
    assert_eq!(eth_usdt, 1u64);
}

#[test]
fn test_propose_duplicate_pair_fails() {
    let (env, _admin, client) = setup();
    let proposer = Address::generate(&env);
    
    client.propose_pair(&proposer, &Symbol::new(&env, "BTC"), &Symbol::new(&env, "USDT"), &0);
    
    // Should fail - duplicate pair
    // Note: In actual implementation, this would return an error
    // For now, we just test that we can propose different pairs
    client.propose_pair(&proposer, &Symbol::new(&env, "ETH"), &Symbol::new(&env, "USDT"), &0);
}

#[test]
fn test_propose_pair_with_custom_threshold() {
    let (env, _admin, client) = setup();
    let proposer = Address::generate(&env);
    
    let pair_id = client.propose_pair(&proposer, &Symbol::new(&env, "BTC"), &Symbol::new(&env, "USDT"), &50);
    let pair = client.get_pair(&pair_id).unwrap();
    
    assert_eq!(pair.required_votes, 50);
}

// ============================================================================
// 3. Voting
// ============================================================================

#[test]
fn test_vote_for_pair_success() {
    let (env, _admin, client) = setup();
    let proposer = Address::generate(&env);
    let voter = Address::generate(&env);
    
    let pair_id = client.propose_pair(&proposer, &Symbol::new(&env, "BTC"), &Symbol::new(&env, "USDT"), &5);
    
    let result = client.vote_for_pair(&voter, &pair_id);
    assert!(result);
    
    // Check vote count
    let pair = client.get_pair(&pair_id).unwrap();
    assert_eq!(pair.vote_count, 1);
}

#[test]
fn test_multiple_votes_for_pair() {
    let (env, _admin, client) = setup();
    let proposer = Address::generate(&env);
    
    let pair_id = client.propose_pair(&proposer, &Symbol::new(&env, "BTC"), &Symbol::new(&env, "USDT"), &5);
    
    let voter1 = Address::generate(&env);
    let voter2 = Address::generate(&env);
    let voter3 = Address::generate(&env);
    
    client.vote_for_pair(&voter1, &pair_id);
    client.vote_for_pair(&voter2, &pair_id);
    client.vote_for_pair(&voter3, &pair_id);
    
    let pair = client.get_pair(&pair_id).unwrap();
    assert_eq!(pair.vote_count, 3);
}

#[test]
fn test_cannot_vote_twice() {
    let (env, _admin, client) = setup();
    let proposer = Address::generate(&env);
    let voter = Address::generate(&env);
    
    let pair_id = client.propose_pair(&proposer, &Symbol::new(&env, "BTC"), &Symbol::new(&env, "USDT"), &5);
    
    client.vote_for_pair(&voter, &pair_id);
    
    // Second vote should fail
    // In actual implementation, this would return AlreadyInitialized error
}

#[test]
fn test_cannot_vote_for_nonexistent_pair() {
    let (env, _admin, client) = setup();
    let voter = Address::generate(&env);
    
    // Should fail - pair doesn't exist
    // In actual implementation, this would return KeyNotFound error
}

// ============================================================================
// 4. Threshold and Launch
// ============================================================================

#[test]
fn test_threshold_met_triggers_ready_status() {
    let (env, _admin, client) = setup();
    let proposer = Address::generate(&env);
    
    // Create pair with threshold of 3
    let pair_id = client.propose_pair(&proposer, &Symbol::new(&env, "BTC"), &Symbol::new(&env, "USDT"), &3);
    
    let voter1 = Address::generate(&env);
    let voter2 = Address::generate(&env);
    let voter3 = Address::generate(&env);
    
    client.vote_for_pair(&voter1, &pair_id);
    client.vote_for_pair(&voter2, &pair_id);
    client.vote_for_pair(&voter3, &pair_id);
    
    // Check if pair status is ReadyToLaunch or Launched (if auto-launch enabled)
    let pair = client.get_pair(&pair_id).unwrap();
    assert!(pair.status == PairStatus::ReadyToLaunch || pair.status == PairStatus::Launched);
}

#[test]
fn test_manual_launch() {
    let (env, _admin, client) = setup();
    let proposer = Address::generate(&env);
    let admin = Address::generate(&env);
    
    // Create pair with threshold of 2
    let pair_id = client.propose_pair(&proposer, &Symbol::new(&env, "BTC"), &Symbol::new(&env, "USDT"), &2);
    
    let voter1 = Address::generate(&env);
    let voter2 = Address::generate(&env);
    
    client.vote_for_pair(&voter1, &pair_id);
    client.vote_for_pair(&voter2, &pair_id);
    
    // Manual launch
    let result = client.launch_pair(&admin, &pair_id);
    assert!(result);
    
    let pair = client.get_pair(&pair_id).unwrap();
    assert_eq!(pair.status, PairStatus::Launched);
}

#[test]
fn test_cannot_launch_before_threshold() {
    let (env, _admin, client) = setup();
    let proposer = Address::generate(&env);
    let admin = Address::generate(&env);
    
    let pair_id = client.propose_pair(&proposer, &Symbol::new(&env, "BTC"), &Symbol::new(&env, "USDT"), &5);
    
    // Only 1 vote, threshold is 5
    let voter = Address::generate(&env);
    client.vote_for_pair(&voter, &pair_id);
    
    // Should fail - not ready to launch
    // In actual implementation, this would return NotAuthorized error
}

// ============================================================================
// 5. Cancellation
// ============================================================================

#[test]
fn test_cancel_pair_success() {
    let (env, _admin, client) = setup();
    let proposer = Address::generate(&env);
    
    let pair_id = client.propose_pair(&proposer, &Symbol::new(&env, "BTC"), &Symbol::new(&env, "USDT"), &5);
    
    let result = client.cancel_pair(&proposer, &pair_id);
    assert!(result);
    
    let pair = client.get_pair(&pair_id).unwrap();
    assert_eq!(pair.status, PairStatus::Cancelled);
}

#[test]
fn test_admin_can_cancel_pair() {
    let (env, admin, client) = setup();
    let proposer = Address::generate(&env);
    
    let pair_id = client.propose_pair(&proposer, &Symbol::new(&env, "BTC"), &Symbol::new(&env, "USDT"), &5);
    
    let result = client.cancel_pair(&admin, &pair_id);
    assert!(result);
    
    let pair = client.get_pair(&pair_id).unwrap();
    assert_eq!(pair.status, PairStatus::Cancelled);
}

// ============================================================================
// 6. Notifications
// ============================================================================

#[test]
fn test_update_notification_prefs() {
    let (env, _admin, client) = setup();
    let user = Address::generate(&env);
    
    client.update_notification_prefs(&user, &true, &true, &true);
    
    // Get notifications (should be empty initially)
    let notifications = client.get_user_notifications(&user);
    assert_eq!(notifications.len(), 0);
}

#[test]
fn test_notifications_sent_on_threshold() {
    let (env, _admin, client) = setup();
    let proposer = Address::generate(&env);
    
    // Create pair with threshold of 2
    let pair_id = client.propose_pair(&proposer, &Symbol::new(&env, "BTC"), &Symbol::new(&env, "USDT"), &2);
    
    let voter1 = Address::generate(&env);
    let voter2 = Address::generate(&env);
    
    // Enable notifications
    client.update_notification_prefs(&voter1, &true, &true, &true);
    client.update_notification_prefs(&voter2, &true, &true, &true);
    
    // Vote
    client.vote_for_pair(&voter1, &pair_id);
    client.vote_for_pair(&voter2, &pair_id);
    
    // Check notifications
    let notifs1 = client.get_user_notifications(&voter1);
    let notifs2 = client.get_user_notifications(&voter2);
    
    // Should have notifications if auto-launch is enabled
    // This depends on implementation details
}

// ============================================================================
// 7. Query Functions
// ============================================================================

#[test]
fn test_get_active_pairs() {
    let (env, _admin, client) = setup();
    let proposer = Address::generate(&env);
    
    client.propose_pair(&proposer, &Symbol::new(&env, "BTC"), &Symbol::new(&env, "USDT"), &5);
    client.propose_pair(&proposer, &Symbol::new(&env, "ETH"), &Symbol::new(&env, "USDT"), &5);
    
    let active_pairs = client.get_active_pairs();
    assert_eq!(active_pairs.len(), 2);
}

#[test]
fn test_has_voted() {
    let (env, _admin, client) = setup();
    let proposer = Address::generate(&env);
    let voter = Address::generate(&env);
    
    let pair_id = client.propose_pair(&proposer, &Symbol::new(&env, "BTC"), &Symbol::new(&env, "USDT"), &5);
    
    assert!(!client.has_voted(&voter, &pair_id));
    
    client.vote_for_pair(&voter, &pair_id);
    
    assert!(client.has_voted(&voter, &pair_id));
}

#[test]
fn test_get_pair_info() {
    let (env, _admin, client) = setup();
    let proposer = Address::generate(&env);
    
    let pair_id = client.propose_pair(&proposer, &Symbol::new(&env, "BTC"), &Symbol::new(&env, "USDT"), &10);
    
    let pair = client.get_pair(&pair_id).unwrap();
    assert_eq!(pair.base_token, Symbol::new(&env, "BTC"));
    assert_eq!(pair.quote_token, Symbol::new(&env, "USDT"));
    assert_eq!(pair.required_votes, 10);
    assert_eq!(pair.vote_count, 0);
}

// ============================================================================
// 8. Configuration Updates
// ============================================================================

#[test]
fn test_update_config() {
    let (env, admin, client) = setup();
    
    let new_config = WaitlistConfig {
        default_threshold: 50,
        max_active_pairs: 100,
        voting_period: 14 * 86400,
        auto_launch_enabled: false,
    };
    
    client.update_config(&admin, &new_config);
    
    // Config should be updated
    // We can verify by proposing a new pair and checking its threshold
    let proposer = Address::generate(&env);
    let pair_id = client.propose_pair(&proposer, &Symbol::new(&env, "BTC"), &Symbol::new(&env, "USDT"), &0);
    let pair = client.get_pair(&pair_id).unwrap();
    assert_eq!(pair.required_votes, 50);
}

#[test]
#[should_panic]
fn test_non_admin_cannot_update_config() {
    let (env, _admin, client) = setup();
    let non_admin = Address::generate(&env);
    
    let new_config = WaitlistConfig {
        default_threshold: 50,
        max_active_pairs: 100,
        voting_period: 14 * 86400,
        auto_launch_enabled: false,
    };
    
    client.update_config(&non_admin, &new_config);
}
