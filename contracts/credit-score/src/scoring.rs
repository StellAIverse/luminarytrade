#![no_std]
use soroban_sdk::Env;
use crate::validation::{MIN_SCORE, MAX_SCORE};

pub const WEIGHT_PAYMENT_HISTORY: u32 = 35;
pub const WEIGHT_UTILIZATION: u32 = 30;
pub const WEIGHT_LENGTH: u32 = 15;
pub const WEIGHT_MIX: u32 = 10;
pub const WEIGHT_NEW_INQUIRIES: u32 = 10;

pub fn calculate_weighted_average(
    payment_history: u32,
    utilization: u32,
    length: u32,
    mix: u32,
    new_inquiries: u32,
) -> u32 {
    let mut total = payment_history * WEIGHT_PAYMENT_HISTORY;
    total += utilization * WEIGHT_UTILIZATION;
    total += length * WEIGHT_LENGTH;
    total += mix * WEIGHT_MIX;
    total += new_inquiries * WEIGHT_NEW_INQUIRIES;
    
    // total is between 0 and 10000 (since weights sum to 100 and factors are up to 100)
    total / 100
}

pub fn calculate_final_score(
    weighted_average: u32,
    penalties: u32,
) -> u32 {
    let score_range = MAX_SCORE - MIN_SCORE;
    
    // Calculate raw score based on weighted average (0-100)
    // score = (weighted_average * 550 / 100) + 300
    let mut score = (weighted_average * score_range / 100) + MIN_SCORE;
    
    // Apply penalties
    if score > penalties + MIN_SCORE {
        score -= penalties;
    } else {
        score = MIN_SCORE;
    }
    
    // Final clamp to ensure within range
    if score > MAX_SCORE {
        MAX_SCORE
    } else if score < MIN_SCORE {
        MIN_SCORE
    } else {
        score
    }
}
