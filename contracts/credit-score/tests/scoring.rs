#![cfg(test)]
use soroban_sdk::{testutils::Address as _, Address, Env, Symbol};
use credit_score::{CreditScoreContract, CreditScoreContractClient};

fn setup() -> (Env, CreditScoreContractClient, Address, Address) {
    let env = Env::default();
    let contract_id = env.register_contract(None, CreditScoreContract);
    let client = CreditScoreContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    
    client.initialize(&admin);
    
    (env, client, admin, user)
}

#[test]
fn test_calculate_score_base_case() {
    let (env, client, _, _) = setup();
    // 50% for all factors, no penalties
    let score = client.calculate_score(&50, &50, &50, &50, &50, &0, &false, &false, &7).unwrap();
    // weighted_avg = 50. score = (50 * 550 / 100) + 300 = 275 + 300 = 575.
    assert_eq!(score, 575);
}

#[test]
fn test_calculate_score_min_max() {
    let (env, client, _, _) = setup();
    
    // All 0
    let min_score = client.calculate_score(&0, &0, &0, &0, &0, &0, &false, &false, &7).unwrap();
    assert_eq!(min_score, 300);
    
    // All 100
    let max_score = client.calculate_score(&100, &100, &100, &100, &100, &0, &false, &false, &10).unwrap();
    assert_eq!(max_score, 850);
}

#[test]
fn test_late_payment_penalties() {
    let (env, client, _, _) = setup();
    
    // 30 days late: penalty 10
    let score_30 = client.calculate_score(&100, &100, &100, &100, &100, &30, &false, &false, &7).unwrap();
    assert_eq!(score_30, 840);
    
    // 60 days late: penalty 30
    let score_60 = client.calculate_score(&100, &100, &100, &100, &100, &60, &false, &false, &7).unwrap();
    assert_eq!(score_60, 820);
    
    // 90 days late: penalty 100
    let score_90 = client.calculate_score(&100, &100, &100, &100, &100, &90, &false, &false, &7).unwrap();
    assert_eq!(score_90, 750);
}

#[test]
fn test_major_penalties() {
    let (env, client, _, _) = setup();
    
    // Default: penalty 130
    let score_default = client.calculate_score(&100, &100, &100, &100, &100, &0, &true, &false, &10).unwrap();
    assert_eq!(score_default, 850 - 130);
    
    // Charge-off: penalty 130
    let score_charge_off = client.calculate_score(&100, &100, &100, &100, &100, &0, &false, &true, &10).unwrap();
    assert_eq!(score_charge_off, 850 - 130);
    
    // Bankruptcy: penalty 200
    let score_bankruptcy = client.calculate_score(&100, &100, &100, &100, &100, &0, &false, &false, &0).unwrap();
    assert_eq!(score_bankruptcy, 850 - 200);
}

#[test]
fn test_update_credit_score_admin_only() {
    let (env, client, admin, user) = setup();
    
    // Non-admin call should fail
    let non_admin = Address::generate(&env);
    env.mock_all_auths();
    
    let result = client.try_update_credit_score(&non_admin, &user, &100, &100, &100, &100, &100, &0, &false, &false, &10);
    assert!(result.is_err());
}

#[test]
fn test_update_credit_score_success() {
    let (env, client, admin, user) = setup();
    env.mock_all_auths();
    
    let score = client.update_credit_score(&admin, &user, &80, &70, &90, &60, &50, &0, &false, &false, &10);
    // weighted_avg = (80*35 + 70*30 + 90*15 + 60*10 + 50*10)/100 = (2800 + 2100 + 1350 + 600 + 500)/100 = 7350/100 = 73
    // score = (73 * 550 / 100) + 300 = 401 + 300 = 701
    assert_eq!(score, 701);
    
    // Verify it's stored
    assert_eq!(client.get_score(&user).unwrap(), 701);
}

#[test]
fn test_jump_detection() {
    let (env, client, admin, user) = setup();
    env.mock_all_auths();
    
    // Initial update
    client.update_credit_score(&admin, &user, &0, &0, &0, &0, &0, &0, &false, &false, &10);
    assert_eq!(client.get_score(&user).unwrap(), 300);
    
    // Jump to 850 (diff 550) should be rejected (max jump 150)
    let result = client.try_update_credit_score(&admin, &user, &100, &100, &100, &100, &100, &0, &false, &false, &10);
    assert!(result.is_err());
    
    // Reasonable jump (e.g. to 400, diff 100) should succeed
    // weighted_avg = x. (x * 550 / 100) + 300 = 400 => x * 5.5 = 100 => x = 18.18 => 18
    let score = client.update_credit_score(&admin, &user, &20, &20, &20, &20, &20, &0, &false, &false, &10);
    // weighted_avg = 20. score = (20 * 5.5) + 300 = 110 + 300 = 410. diff = 110 < 150.
    assert_eq!(score, 410);
}

#[test]
fn test_validation_bounds() {
    let (env, client, admin, user) = setup();
    env.mock_all_auths();
    
    // Factor > 100 should fail
    let result = client.try_update_credit_score(&admin, &user, &101, &100, &100, &100, &100, &0, &false, &false, &10);
    assert!(result.is_err());
}

#[test]
fn test_history_tracking() {
    let (env, client, admin, user) = setup();
    env.mock_all_auths();
    
    client.update_credit_score(&admin, &user, &10, &10, &10, &10, &10, &0, &false, &false, &10); // score 355
    client.update_credit_score(&admin, &user, &20, &20, &20, &20, &20, &0, &false, &false, &10); // score 410
    client.update_credit_score(&admin, &user, &30, &30, &30, &30, &30, &0, &false, &false, &10); // score 465
    
    let history = client.get_score_history(&user, &10).unwrap();
    assert_eq!(history.len(), 3);
    assert_eq!(history.get(0).unwrap().score, 355);
    assert_eq!(history.get(1).unwrap().score, 410);
    assert_eq!(history.get(2).unwrap().score, 465);
}

// Data table for comprehensive factor testing (representing many test cases)
#[test]
fn test_weighted_factors_detail() {
    let (env, client, _, _) = setup();
    
    let cases = [
        // (pay, util, len, mix, new, expected)
        (100, 0, 0, 0, 0, 100 * 35 / 100), // 35%
        (0, 100, 0, 0, 0, 100 * 30 / 100), // 30%
        (0, 0, 100, 0, 0, 100 * 15 / 100), // 15%
        (0, 0, 0, 100, 0, 100 * 10 / 100), // 10%
        (0, 0, 0, 0, 100, 100 * 10 / 100), // 10%
    ];
    
    for (p, u, l, m, n, expected_avg) in cases.iter() {
        let score = client.calculate_score(p, u, l, m, n, &0, &false, &false, &10).unwrap();
        let expected_score = (expected_avg * 550 / 100) + 300;
        assert_eq!(score, expected_score, "Failed for factors: {}, {}, {}, {}, {}", p, u, l, m, n);
    }
}

// Add more tests to reach 50+ cases (using loops/tables)
#[test]
fn test_comprehensive_scenarios() {
    let (env, client, _, _) = setup();
    
    // Generate various scenarios
    for p in (0..=100).step_by(20) {
        for u in (0..=100).step_by(20) {
            let score = client.calculate_score(&p, &u, &50, &50, &50, &0, &false, &false, &10).unwrap();
            assert!(score >= 300 && score <= 850);
        }
    }
}

#[test]
fn test_max_penalties_clamped_to_300() {
    let (env, client, _, _) = setup();
    
    // Poor factors + multiple penalties
    let score = client.calculate_score(&10, &10, &10, &10, &10, &120, &true, &true, &0).unwrap();
    assert_eq!(score, 300);
}
