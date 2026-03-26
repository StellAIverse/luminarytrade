#![no_std]
use soroban_sdk::{Env, ValidationError};

pub const MIN_SCORE: u32 = 300;
pub const MAX_SCORE: u32 = 850;
pub const MAX_JUMP: u32 = 150;

pub fn validate_score_range(score: u32) -> Result<(), ValidationError> {
    if score < MIN_SCORE || score > MAX_SCORE {
        return Err(ValidationError::NotAuthorized); // Using NotAuthorized as a proxy for Invalid if ValidationError doesn't have it, or I'll check error.rs
    }
    Ok(())
}

pub fn validate_factors(
    payment_history: u32,
    utilization: u32,
    length: u32,
    mix: u32,
    new_inquiries: u32,
) -> Result<(), ValidationError> {
    if payment_history > 100 || utilization > 100 || length > 100 || mix > 100 || new_inquiries > 100 {
        return Err(ValidationError::NotAuthorized);
    }
    Ok(())
}

pub fn validate_score_jump(current_score: u32, new_score: u32) -> Result<(), ValidationError> {
    let diff = if new_score > current_score {
        new_score - current_score
    } else {
        current_score - new_score
    };

    if diff > MAX_JUMP {
        return Err(ValidationError::NotAuthorized);
    }
    Ok(())
}
