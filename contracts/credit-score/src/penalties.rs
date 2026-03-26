#![no_std]
use soroban_sdk::Env;

pub const DEFAULT_PENALTY: u32 = 130;
pub const CHARGE_OFF_PENALTY: u32 = 130;
pub const BANKRUPTCY_PENALTY: u32 = 200;

pub fn calculate_late_payment_penalty(days_late: u32) -> u32 {
    if days_late < 30 {
        0
    } else if days_late < 60 {
        10
    } else if days_late < 90 {
        30
    } else {
        100
    }
}

pub fn calculate_total_penalties(
    days_late: u32,
    defaulted: bool,
    charged_off: bool,
    bankrupt_years: u32,
) -> u32 {
    let mut total = calculate_late_payment_penalty(days_late);
    
    if defaulted {
        total += DEFAULT_PENALTY;
    }
    
    if charged_off {
        total += CHARGE_OFF_PENALTY;
    }
    
    // Bankruptcy penalty applies up to 7 years
    if bankrupt_years < 7 {
        total += BANKRUPTCY_PENALTY;
    }
    
    total
}
