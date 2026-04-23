# Affiliate Bonus Contract

A referral and affiliate bonus system with on-chain commission tracking and transparent payouts on Stellar/Soroban.

## Overview

This contract implements a comprehensive affiliate marketing system where users can earn commissions by referring new users. The system tracks trading volume, calculates commissions automatically, and provides transparent payout mechanisms.

## Features

- **Referral Tracking**: On-chain tracking of referral relationships
- **Commission on Volume**: Percentage-based commissions on trading volume
- **Transparent Payouts**: All commissions and payouts visible on-chain
- **Multi-Level Referrals**: Support for multi-tier referral structures (configurable)
- **Automated Distribution**: Automatic commission calculation and distribution
- **Configurable Rates**: Flexible commission rates per affiliate
- **Admin Controls**: Suspension and configuration management

## Contract Functions

### Initialization
- `initialize(admin, default_commission_rate_bps)` - Initialize the contract

### Affiliate Management
- `register_affiliate(affiliate, referral_code, commission_rate_bps)` - Register as affiliate
- `suspend_affiliate(admin, affiliate)` - Suspend an affiliate (admin only)

### Referral System
- `signup_with_referral(user, referral_code)` - Sign up using referral code
- `record_volume(user, volume)` - Record trading volume and calculate commissions

### Commission & Payouts
- `withdraw_commission(affiliate)` - Withdraw pending commissions
- `get_pending_commission(affiliate)` - Get pending commission amount

### Query Functions
- `get_affiliate(affiliate)` - Get affiliate information
- `get_referrer(user)` - Get user's referrer
- `get_user_volume(user)` - Get user's trading volume
- `get_payout_history(affiliate)` - Get affiliate's payout history

### Configuration
- `update_config(admin, config)` - Update affiliate configuration

## Data Structures

### Affiliate
```rust
pub struct Affiliate {
    pub address: Address,
    pub referral_code: Symbol,
    pub status: AffiliateStatus,
    pub commission_rate_bps: u32,
    pub referred_count: u32,
    pub total_commission_earned: i128,
    pub total_commission_withdrawn: i128,
    pub registered_at: u64,
    pub level: u32,
}
```

### AffiliateStatus
- `Active` - Active and earning commissions
- `Suspended` - Temporarily suspended
- `Banned` - Permanently banned

### CommissionRecord
```rust
pub struct CommissionRecord {
    pub record_id: u64,
    pub affiliate: Address,
    pub referred_user: Address,
    pub volume: i128,
    pub commission: i128,
    pub commission_rate_bps: u32,
    pub timestamp: u64,
}
```

### PayoutRecord
```rust
pub struct PayoutRecord {
    pub payout_id: u64,
    pub affiliate: Address,
    pub amount: i128,
    pub timestamp: u64,
    pub tx_hash: Option<Symbol>,
}
```

## Usage Example

```rust
// Initialize contract
client.initialize(&admin, &500); // 5% default commission

// Register affiliate
let affiliate1 = Address::generate(&env);
client.register_affiliate(&affiliate1, &Symbol::new(&env, "AFF001"), &500);

// User signs up with referral
let user1 = Address::generate(&env);
client.signup_with_referral(&user1, &Symbol::new(&env, "AFF001"));

// Record trading volume (triggers commission calculation)
let volume = 1000_000_000; // 1000 tokens
client.record_volume(&user1, &volume);

// Check pending commission
let pending = client.get_pending_commission(&affiliate1);

// Withdraw commission
client.withdraw_commission(&affiliate1);
```

## Commission Calculation

Commissions are calculated as:
```
commission = (volume * commission_rate_bps) / 10000
```

Example:
- Volume: 10,000 tokens
- Commission Rate: 500 bps (5%)
- Commission: (10,000 * 500) / 10,000 = 500 tokens

## Events

- `aff_init` - Contract initialized
- `aff_reg` - New affiliate registered
- `aff_signup` - User signed up with referral
- `aff_withdraw` - Commission withdrawn
- `aff_suspend` - Affiliate suspended
- `aff_cfg_upd` - Configuration updated

## Multi-Level Referrals

The contract supports multi-level referral structures:
- Configurable number of levels (default: 3)
- Each level can have different commission rates
- Indirect referrals are tracked automatically

## Security Considerations

- Authentication required for all state-changing operations
- One referral code per affiliate
- Users can only be referred once
- Admin controls for suspension and configuration
- Minimum payout amounts prevent dust transactions
- All transactions are transparent and auditable

## Testing

Run tests with:
```bash
cargo test
```

## Deployment

Build the contract:
```bash
soroban contract build
```

Deploy to testnet:
```bash
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/affiliate_bonus.wasm
```
