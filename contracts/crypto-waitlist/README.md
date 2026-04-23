# Crypto Waitlist Contract

A community-driven waitlist system for launching new cryptocurrency trading pairs on Stellar/Soroban.

## Overview

This contract enables decentralized governance for adding new trading pairs to the platform. Users can vote for pairs they want to see launched, and pairs are automatically launched when they reach a predefined vote threshold.

## Features

- **Community-Driven**: Users vote for trading pairs they want
- **Threshold-Based Launch**: Automatic launch when vote threshold is met
- **Notification System**: Users receive notifications for status updates
- **Flexible Configuration**: Admin can customize thresholds and settings
- **Transparent Process**: All votes and launches are on-chain

## Contract Functions

### Initialization
- `initialize(admin, default_threshold)` - Initialize the contract

### Pair Management
- `propose_pair(proposer, base_token, quote_token, required_votes)` - Propose a new trading pair
- `vote_for_pair(voter, pair_id)` - Vote for a trading pair
- `launch_pair(caller, pair_id)` - Manually launch a pair
- `cancel_pair(caller, pair_id)` - Cancel a trading pair proposal

### Query Functions
- `get_pair(pair_id)` - Get pair information
- `get_active_pairs()` - Get all active pairs
- `has_voted(user, pair_id)` - Check if user has voted for a pair

### Notifications
- `update_notification_prefs(user, enabled, notify_on_launch, notify_on_threshold)` - Update preferences
- `get_user_notifications(user)` - Get user's notifications

### Configuration
- `update_config(admin, config)` - Update waitlist configuration

## Data Structures

### TradingPair
```rust
pub struct TradingPair {
    pub pair_id: u64,
    pub base_token: Symbol,
    pub quote_token: Symbol,
    pub status: PairStatus,
    pub vote_count: u32,
    pub required_votes: u32,
    pub proposed_at: u64,
    pub launched_at: Option<u64>,
    pub proposed_by: Address,
}
```

### PairStatus
- `Active` - Collecting votes
- `ReadyToLaunch` - Threshold met
- `Launched` - Pair has been launched
- `Cancelled` - Proposal cancelled

## Usage Example

```rust
// Initialize contract
client.initialize(&admin, &100);

// Propose new pair (BTC/USDT)
let pair_id = client.propose_pair(&proposer, &Symbol::new(&env, "BTC"), &Symbol::new(&env, "USDT"), &0);

// Users vote for the pair
client.vote_for_pair(&voter1, &pair_id);
client.vote_for_pair(&voter2, &pair_id);
// ... more votes until threshold is reached

// Pair automatically launches when threshold is met
// Or manually launch
client.launch_pair(&admin, &pair_id);
```

## Events

- `wl_init` - Contract initialized
- `wl_propose` - New pair proposed
- `wl_vote` - Vote cast
- `wl_launch` - Pair launched
- `wl_cancel` - Pair cancelled
- `wl_cfg_upd` - Configuration updated

## Security Considerations

- Authentication required for all state-changing operations
- One vote per user per pair
- Admin controls for configuration and emergency cancellation
- Threshold prevents premature launches

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
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/crypto_waitlist.wasm
```
