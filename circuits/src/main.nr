// circuits/src/main.nr
// ZK Proof-of-Balance: proves balance >= threshold without revealing balance
//
// Private inputs:  balance (u64, in cents)
// Public inputs:   threshold (u64, in cents)
// Constraint:      balance >= threshold

fn main(balance: u64, threshold: pub u64) {
    // Core constraint: private balance must be >= public threshold
    // In Noir, assert panics (proof fails) if condition is false
    assert(balance >= threshold, "Balance is below required threshold");
}

// Test: 1250 USD (125000 cents) >= 1000 USD (100000 cents) → should pass
#[test]
fn test_proof_passes() {
    main(125000, 100000);
}

// Test: 500 USD < 1000 USD → should fail
#[test(should_fail)]
fn test_proof_fails() {
    main(50000, 100000);
}

// Test: exact equality edge case → should pass  
#[test]
fn test_exact_match() {
    main(100000, 100000);
}

// Test: zero threshold → always passes
#[test]
fn test_zero_threshold() {
    main(0, 0);
}
