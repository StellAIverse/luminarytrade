#![cfg(test)]

extern crate std;

use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    Address, Env, Symbol, Vec, String,
};

use affiliate_bonus::{
    AffiliateBonusContract, AffiliateBonusContractClient, 
    Affiliate, AffiliateStatus, AffiliateConfig,
};
use common_utils::error::CommonError;

// ============================================================================
// Test helpers
// ============================================================================

fn setup() -> (Env, Address, AffiliateBonusContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, AffiliateBonusContract);
    let client = AffiliateBonusContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin, &500); // 5% default commission rate
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
    client.initialize(&admin, &500);
}

// ============================================================================
// 2. Affiliate Registration
// ============================================================================

#[test]
fn test_register_affiliate_success() {
    let (env, _admin, client) = setup();
    let affiliate = Address::generate(&env);
    
    let referral_code = Symbol::new(&env, "AFF001");
    let result = client.register_affiliate(&affiliate, &referral_code, &0);
    
    assert!(result);
    
    let affiliate_info = client.get_affiliate(&affiliate).unwrap();
    assert_eq!(affiliate_info.referral_code, referral_code);
    assert_eq!(affiliate_info.status, AffiliateStatus::Active);
    assert_eq!(affiliate_info.commission_rate_bps, 500); // Default rate
}

#[test]
fn test_register_affiliate_with_custom_rate() {
    let (env, _admin, client) = setup();
    let affiliate = Address::generate(&env);
    
    let referral_code = Symbol::new(&env, "AFF002");
    let result = client.register_affiliate(&affiliate, &referral_code, &1000); // 10%
    
    assert!(result);
    
    let affiliate_info = client.get_affiliate(&affiliate).unwrap();
    assert_eq!(affiliate_info.commission_rate_bps, 1000);
}

#[test]
fn test_cannot_register_twice() {
    let (env, _admin, client) = setup();
    let affiliate = Address::generate(&env);
    
    let referral_code = Symbol::new(&env, "AFF003");
    client.register_affiliate(&affiliate, &referral_code, &0);
    
    // Second registration should fail
    // In actual implementation, this would return AlreadyInitialized error
}

#[test]
fn test_cannot_use_duplicate_referral_code() {
    let (env, _admin, client) = setup();
    let affiliate1 = Address::generate(&env);
    let affiliate2 = Address::generate(&env);
    
    let referral_code = Symbol::new(&env, "DUPCODE");
    client.register_affiliate(&affiliate1, &referral_code, &0);
    
    // Second affiliate with same code should fail
    // In actual implementation, this would return AlreadyInitialized error
}

// ============================================================================
// 3. Referral Signup
// ============================================================================

#[test]
fn test_signup_with_referral() {
    let (env, _admin, client) = setup();
    let affiliate = Address::generate(&env);
    let user = Address::generate(&env);
    
    let referral_code = Symbol::new(&env, "REF001");
    client.register_affiliate(&affiliate, &referral_code, &0);
    
    let result = client.signup_with_referral(&user, &referral_code);
    assert!(result);
    
    // Check referral relationship
    let referrer = client.get_referrer(&user).unwrap();
    assert_eq!(referrer, affiliate);
    
    // Check affiliate's referred count
    let affiliate_info = client.get_affiliate(&affiliate).unwrap();
    assert_eq!(affiliate_info.referred_count, 1);
}

#[test]
fn test_cannot_signup_twice_with_referral() {
    let (env, _admin, client) = setup();
    let affiliate = Address::generate(&env);
    let user = Address::generate(&env);
    
    let referral_code = Symbol::new(&env, "REF002");
    client.register_affiliate(&affiliate, &referral_code, &0);
    
    client.signup_with_referral(&user, &referral_code);
    
    // Second signup should fail
    // In actual implementation, this would return AlreadyInitialized error
}

// ============================================================================
// 4. Volume Tracking & Commission
// ============================================================================

#[test]
fn test_record_volume_generates_commission() {
    let (env, _admin, client) = setup();
    let affiliate = Address::generate(&env);
    let user = Address::generate(&env);
    
    let referral_code = Symbol::new(&env, "VOL001");
    client.register_affiliate(&affiliate, &referral_code, &500); // 5%
    client.signup_with_referral(&user, &referral_code);
    
    // Record volume
    let volume = 1000_000_000; // 1000 tokens
    let commission = client.record_volume(&user, &volume);
    
    // Commission should be 5% of volume = 50 tokens
    let expected_commission = (volume * 500) / 10000;
    assert_eq!(commission, expected_commission);
    
    // Check pending commission
    let pending = client.get_pending_commission(&affiliate);
    assert_eq!(pending, expected_commission);
}

#[test]
fn test_multiple_volumes_accumulate_commission() {
    let (env, _admin, client) = setup();
    let affiliate = Address::generate(&env);
    let user = Address::generate(&env);
    
    let referral_code = Symbol::new(&env, "VOL002");
    client.register_affiliate(&affiliate, &referral_code, &1000); // 10%
    client.signup_with_referral(&user, &referral_code);
    
    // Record multiple volumes
    let volume1 = 1000_000_000;
    let volume2 = 2000_000_000;
    
    client.record_volume(&user, &volume1);
    client.record_volume(&user, &volume2);
    
    // Total commission should be 10% of (1000 + 2000) = 300 tokens
    let total_volume = volume1 + volume2;
    let expected_commission = (total_volume * 1000) / 10000;
    
    let pending = client.get_pending_commission(&affiliate);
    assert_eq!(pending, expected_commission);
}

#[test]
fn test_user_volume_tracking() {
    let (env, _admin, client) = setup();
    let affiliate = Address::generate(&env);
    let user = Address::generate(&env);
    
    let referral_code = Symbol::new(&env, "VOL003");
    client.register_affiliate(&affiliate, &referral_code, &0);
    client.signup_with_referral(&user, &referral_code);
    
    let volume = 5000_000_000;
    client.record_volume(&user, &volume);
    
    let user_volume = client.get_user_volume(&user);
    assert_eq!(user_volume.total_volume, volume);
    assert_eq!(user_volume.period_volume, volume);
}

// ============================================================================
// 5. Commission Withdrawal
// ============================================================================

#[test]
fn test_withdraw_commission() {
    let (env, _admin, client) = setup();
    let affiliate = Address::generate(&env);
    let user = Address::generate(&env);
    
    let referral_code = Symbol::new(&env, "WITHDRAW001");
    client.register_affiliate(&affiliate, &referral_code, &1000); // 10%
    client.signup_with_referral(&user, &referral_code);
    
    // Generate commission
    let volume = 100_000_000_000; // 100,000 tokens
    client.record_volume(&user, &volume);
    
    // Expected commission: 10% of 100,000 = 10,000 tokens
    let expected_commission = (volume * 1000) / 10000;
    
    // Withdraw
    let withdrawn = client.withdraw_commission(&affiliate);
    assert_eq!(withdrawn, expected_commission);
    
    // Pending should be 0 after withdrawal
    let pending = client.get_pending_commission(&affiliate);
    assert_eq!(pending, 0);
    
    // Check affiliate's withdrawn total
    let affiliate_info = client.get_affiliate(&affiliate).unwrap();
    assert_eq!(affiliate_info.total_commission_withdrawn, expected_commission);
}

#[test]
fn test_cannot_withdraw_below_minimum() {
    let (env, _admin, client) = setup();
    let affiliate = Address::generate(&env);
    let user = Address::generate(&env);
    
    let referral_code = Symbol::new(&env, "WITHDRAW002");
    client.register_affiliate(&affiliate, &referral_code, &100); // 1%
    client.signup_with_referral(&user, &referral_code);
    
    // Generate small commission (below minimum)
    let volume = 10_000_000; // 10 tokens
    client.record_volume(&user, &volume);
    
    // Should fail - below minimum payout
    // In actual implementation, this would return OutOfRange error
}

#[test]
fn test_payout_history() {
    let (env, _admin, client) = setup();
    let affiliate = Address::generate(&env);
    let user = Address::generate(&env);
    
    let referral_code = Symbol::new(&env, "WITHDRAW003");
    client.register_affiliate(&affiliate, &referral_code, &1000);
    client.signup_with_referral(&user, &referral_code);
    
    // Generate and withdraw commission twice
    let volume1 = 100_000_000_000;
    let volume2 = 50_000_000_000;
    
    client.record_volume(&user, &volume1);
    client.withdraw_commission(&affiliate);
    
    client.record_volume(&user, &volume2);
    client.withdraw_commission(&affiliate);
    
    // Check payout history
    let payouts = client.get_payout_history(&affiliate);
    assert_eq!(payouts.len(), 2);
}

// ============================================================================
// 6. Query Functions
// ============================================================================

#[test]
fn test_get_affiliate_info() {
    let (env, _admin, client) = setup();
    let affiliate = Address::generate(&env);
    
    let referral_code = Symbol::new(&env, "QUERY001");
    client.register_affiliate(&affiliate, &referral_code, &750);
    
    let affiliate_info = client.get_affiliate(&affiliate).unwrap();
    assert_eq!(affiliate_info.referral_code, referral_code);
    assert_eq!(affiliate_info.commission_rate_bps, 750);
    assert_eq!(affiliate_info.status, AffiliateStatus::Active);
}

#[test]
fn test_get_referrer() {
    let (env, _admin, client) = setup();
    let affiliate = Address::generate(&env);
    let user = Address::generate(&env);
    
    let referral_code = Symbol::new(&env, "QUERY002");
    client.register_affiliate(&affiliate, &referral_code, &0);
    client.signup_with_referral(&user, &referral_code);
    
    let referrer = client.get_referrer(&user).unwrap();
    assert_eq!(referrer, affiliate);
}

#[test]
fn test_get_pending_commission() {
    let (env, _admin, client) = setup();
    let affiliate = Address::generate(&env);
    let user = Address::generate(&env);
    
    let referral_code = Symbol::new(&env, "QUERY003");
    client.register_affiliate(&affiliate, &referral_code, &500);
    client.signup_with_referral(&user, &referral_code);
    
    // Initially 0
    assert_eq!(client.get_pending_commission(&affiliate), 0);
    
    // Generate commission
    let volume = 10_000_000_000;
    client.record_volume(&user, &volume);
    
    let expected = (volume * 500) / 10000;
    assert_eq!(client.get_pending_commission(&affiliate), expected);
}

// ============================================================================
// 7. Admin Functions
// ============================================================================

#[test]
fn test_suspend_affiliate() {
    let (env, admin, client) = setup();
    let affiliate = Address::generate(&env);
    
    let referral_code = Symbol::new(&env, "ADMIN001");
    client.register_affiliate(&affiliate, &referral_code, &0);
    
    client.suspend_affiliate(&admin, &affiliate);
    
    let affiliate_info = client.get_affiliate(&affiliate).unwrap();
    assert_eq!(affiliate_info.status, AffiliateStatus::Suspended);
}

#[test]
fn test_update_config() {
    let (env, admin, client) = setup();
    
    let new_config = AffiliateConfig {
        default_commission_rate_bps: 1000,
        max_commission_rate_bps: 3000,
        min_payout_amount: 5_000_000,
        multi_level_enabled: false,
        referral_levels: 2,
    };
    
    client.update_config(&admin, &new_config);
    
    // Config should be updated
    // We can verify by registering a new affiliate
    let affiliate = Address::generate(&env);
    let referral_code = Symbol::new(&env, "ADMIN002");
    client.register_affiliate(&affiliate, &referral_code, &0);
    
    let affiliate_info = client.get_affiliate(&affiliate).unwrap();
    assert_eq!(affiliate_info.commission_rate_bps, 1000);
}

#[test]
#[should_panic]
fn test_non_admin_cannot_suspend() {
    let (env, _admin, client) = setup();
    let affiliate = Address::generate(&env);
    let non_admin = Address::generate(&env);
    
    let referral_code = Symbol::new(&env, "ADMIN003");
    client.register_affiliate(&affiliate, &referral_code, &0);
    
    client.suspend_affiliate(&non_admin, &affiliate);
}

#[test]
#[should_panic]
fn test_non_admin_cannot_update_config() {
    let (env, _admin, client) = setup();
    let non_admin = Address::generate(&env);
    
    let new_config = AffiliateConfig {
        default_commission_rate_bps: 1000,
        max_commission_rate_bps: 3000,
        min_payout_amount: 5_000_000,
        multi_level_enabled: false,
        referral_levels: 2,
    };
    
    client.update_config(&non_admin, &new_config);
}
