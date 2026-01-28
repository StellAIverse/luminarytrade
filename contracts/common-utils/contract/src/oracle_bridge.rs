use soroban_sdk::{
    contract, contractimpl, panic_with_error, Symbol, Address, Bytes, Env, 
    contracterror, contracttype,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum Error {
    Unauthorized = 1,
    OracleAlreadyExists = 2,
    OracleNotFound = 3,
    RequestNotFound = 4,
    RequestAlreadyFulfilled = 5,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OracleRequest {
    pub id: u64,
    pub requester: Address,
    pub data_type: u32,
    pub params: Bytes,
    pub fulfilled: bool,
    pub result: Bytes,
    pub timestamp: u64,
}

#[contract]
pub struct OracleBridgeContract;

#[contractimpl]
impl OracleBridgeContract {
    // RENAMED from initialize to init_oracle
    pub fn init_oracle(env: Env, admin: Address) {
        env.storage().persistent().set(&Symbol::new(&env, "admin"), &admin);
        env.storage().persistent().set(&Symbol::new(&env, "req_cnt"), &0u64);
    }

    pub fn add_oracle(env: Env, oracle: Address) {
        let admin: Address = env.storage().persistent().get(&Symbol::new(&env, "admin")).unwrap();
        admin.require_auth();

        let key = (Symbol::new(&env, "oracle"), oracle.clone());
        if env.storage().persistent().has(&key) {
            panic_with_error!(&env, Error::OracleAlreadyExists);
        }
        env.storage().persistent().set(&key, &true);
    }

    pub fn request_data(env: Env, requester: Address, data_type: u32, params: Bytes) -> u64 {
        requester.require_auth();

        let counter: u64 = env.storage().persistent().get(&Symbol::new(&env, "req_cnt")).unwrap_or(0);
        let request_id = counter + 1;

        let request = OracleRequest {
            id: request_id,
            requester: requester.clone(),
            data_type,
            params,
            fulfilled: false,
            result: Bytes::new(&env),
            timestamp: env.ledger().timestamp(),
        };

        let key = (Symbol::new(&env, "request"), request_id);
        env.storage().persistent().set(&key, &request);
        env.storage().persistent().set(&Symbol::new(&env, "req_cnt"), &request_id);

        env.events().publish((Symbol::new(&env, "req_created"),), (request_id, requester, data_type));

        request_id
    }

    pub fn fulfill_request(env: Env, oracle: Address, request_id: u64, result: Bytes) {
        oracle.require_auth();
        
        let oracle_key = (Symbol::new(&env, "oracle"), oracle.clone());
        if !env.storage().persistent().has(&oracle_key) {
             panic_with_error!(&env, Error::Unauthorized);
        }

        let req_key = (Symbol::new(&env, "request"), request_id);
        let mut request: OracleRequest = env.storage().persistent().get(&req_key).unwrap_or_else(|| {
             panic_with_error!(&env, Error::RequestNotFound);
        });

        if request.fulfilled {
            panic_with_error!(&env, Error::RequestAlreadyFulfilled);
        }

        request.fulfilled = true;
        request.result = result;
        
        env.storage().persistent().set(&req_key, &request);
        env.events().publish((Symbol::new(&env, "req_filled"),), (request_id, oracle));
    }
    
    pub fn is_approved_oracle(env: Env, oracle: Address) -> bool {
         let key = (Symbol::new(&env, "oracle"), oracle);
         env.storage().persistent().has(&key)
    }
}
