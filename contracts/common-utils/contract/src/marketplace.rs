use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, token};
use crate::marketplace_types::{Listing, ListingType, DataKey};

#[contract]
pub struct MarketplaceContract;

#[contractimpl]
impl MarketplaceContract {
    
    pub fn list_agent(
        env: Env,
        seller: Address,
        agent_id: u64,           
        asset_address: Address,  
        price: i128,             
        currency: Address,       
        listing_type: ListingType, 
        royalty_bps: u32,        
        royalty_recipient: Address
    ) {
        seller.require_auth();

        let token_client = token::Client::new(&env, &asset_address);
        token_client.transfer(&seller, &env.current_contract_address(), &(1i128));

        let listing = Listing {
            seller: seller.clone(),
            asset_address: asset_address.clone(), // Save this so we can release it later
            price,
            currency,
            listing_type,
            royalty_bps,
            royalty_recipient,
        };

        let key = DataKey::Listing(agent_id);
        env.storage().persistent().set(&key, &listing);

        let topics = (Symbol::new(&env, "agent_listed"), agent_id);
        env.events().publish(topics, listing);
    }

    pub fn buy_agent(env: Env, buyer: Address, agent_id: u64) {
        buyer.require_auth();

        // 1. Get Listing
        let key = DataKey::Listing(agent_id);
        let listing: Listing = env.storage().persistent().get(&key).unwrap();

        // 2. Payments
        let royalty_amount = (listing.price * listing.royalty_bps as i128) / 10000;
        let seller_amount = listing.price - royalty_amount;

        let currency_client = token::Client::new(&env, &listing.currency);
        
        if seller_amount > 0 {
            currency_client.transfer(&buyer, &listing.seller, &seller_amount);
        }
        if royalty_amount > 0 {
            currency_client.transfer(&buyer, &listing.royalty_recipient, &royalty_amount);
        }

        // 3. Release Agent (The Atomic Swap)
        let agent_token_client = token::Client::new(&env, &listing.asset_address);
        agent_token_client.transfer(&env.current_contract_address(), &buyer, &(1i128));

        // 4. Cleanup
        env.storage().persistent().remove(&key);

        let topics = (Symbol::new(&env, "agent_sold"), agent_id);
        env.events().publish(topics, listing.price);
    }
}
