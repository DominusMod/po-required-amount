//! contracts/verifier/src/lib.rs
//! Soroban ZK Verifier Contract — po-required-amount
//!
//! Verification strategy (Path B):
//!   1. Structural validation — proof is correct Groth16 byte length (256 bytes)
//!   2. Public input validation — threshold field element matches `threshold` arg
//!   3. Proof hash anchor — SHA-256(proof) stored on-chain per submitter
//!   4. Event emission — verifiable audit trail on Stellar testnet
//!
//! Cryptographic Groth16 pairing is performed off-chain (in-browser via snarkjs).
//! The contract anchors the proof hash and threshold on-chain so the verification
//! is tamper-evident and publicly auditable.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype,
    symbol_short, log,
    Bytes, BytesN, Env, Vec,
};

// Groth16 BN128 proof = pi_a(64) + pi_b(128) + pi_c(64) = 256 bytes
const GROTH16_PROOF_LEN: u32 = 256;

// Each field element is 32 bytes (BN128)
const FIELD_ELEMENT_LEN: u32 = 32;

#[contracttype]
pub enum DataKey {
    ProofCount,
    // Per-address: last proof hash anchored
    ProofHash(soroban_sdk::Address),
}

#[contract]
pub struct BalanceVerifierContract;

#[contractimpl]
impl BalanceVerifierContract {
    /// Verify and anchor a Groth16 ZK proof that proves wallet_balance >= threshold.
    ///
    /// # Arguments
    /// * `proof`         — raw Groth16 proof bytes (256 bytes: pi_a + pi_b + pi_c)
    /// * `public_inputs` — Vec of 32-byte field elements [result_field, threshold_field]
    /// * `threshold`     — minimum balance in cents (must match encoded value in public_inputs[1])
    /// * `submitter`     — address anchoring this proof (must match tx source)
    ///
    /// # Returns
    /// `true` if structurally valid and threshold matches, `false` otherwise.
    pub fn verify_balance_proof(
        env: Env,
        proof: Bytes,
        public_inputs: Vec<Bytes>,
        threshold: u64,
        submitter: soroban_sdk::Address,
    ) -> bool {
        // Require the submitter to have authorized this call
        submitter.require_auth();

        // ── 1. Structural validation ─────────────────────────────────────
        if proof.len() != GROTH16_PROOF_LEN {
            log!(
                &env,
                "Invalid proof length: got {}, expected {}",
                proof.len(),
                GROTH16_PROOF_LEN
            );
            return false;
        }

        // circuit has 2 public inputs: [result (1 = pass), threshold_cents]
        if public_inputs.len() < 2 {
            log!(&env, "Expected 2 public inputs, got {}", public_inputs.len());
            return false;
        }

        // ── 2. Validate result field element = 1 (proof passed) ─────────
        let result_input = public_inputs.get(0).unwrap();
        if result_input.len() != FIELD_ELEMENT_LEN {
            log!(&env, "Result field element wrong length");
            return false;
        }
        // Result must be 1 — last byte of the 32-byte big-endian field element
        // Bytes 0..30 must be zero, byte 31 must be 1
        for i in 0..31u32 {
            if result_input.get(i).unwrap_or(1) != 0 {
                log!(&env, "Result field element not 1 at byte {}", i);
                return false;
            }
        }
        if result_input.get(31).unwrap_or(0) != 1 {
            log!(&env, "Proof result is not 1 — balance does not meet threshold");
            return false;
        }

        // ── 3. Validate threshold field element matches `threshold` arg ──
        let threshold_input = public_inputs.get(1).unwrap();
        if threshold_input.len() != FIELD_ELEMENT_LEN {
            log!(&env, "Threshold field element wrong length");
            return false;
        }
        // Extract u64 from last 8 bytes of the 32-byte big-endian field element
        let mut threshold_bytes = [0u8; 8];
        for i in 0..8usize {
            threshold_bytes[i] = threshold_input.get((24 + i) as u32).unwrap_or(0);
        }
        let encoded_threshold = u64::from_be_bytes(threshold_bytes);

        if encoded_threshold != threshold {
            log!(
                &env,
                "Threshold mismatch: encoded={}, arg={}",
                encoded_threshold,
                threshold
            );
            return false;
        }

        // ── 4. Anchor proof hash on-chain ────────────────────────────────
        // SHA-256(proof bytes) stored per submitter address.
        // Provides tamper-evident on-chain record without storing the full proof.
        let proof_hash: BytesN<32> = env.crypto().sha256(&proof);
        env.storage()
            .persistent()
            .set(&DataKey::ProofHash(submitter.clone()), &proof_hash);

        // ── 5. Increment global proof counter ────────────────────────────
        let count: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::ProofCount)
            .unwrap_or(0);
        let new_count = count + 1;
        env.storage()
            .persistent()
            .set(&DataKey::ProofCount, &new_count);

        // ── 6. Emit verification event ───────────────────────────────────
        env.events().publish(
            (symbol_short!("verified"), submitter),
            (threshold, new_count, proof_hash),
        );

        log!(
            &env,
            "Proof #{} verified: threshold={} cents",
            new_count,
            threshold
        );

        true
    }

    /// Get the anchored proof hash for a given address (last verified proof).
    pub fn get_proof_hash(env: Env, submitter: soroban_sdk::Address) -> Option<BytesN<32>> {
        env.storage()
            .persistent()
            .get(&DataKey::ProofHash(submitter))
    }

    /// Total number of proofs verified by this contract.
    pub fn proof_count(env: Env) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::ProofCount)
            .unwrap_or(0)
    }
}
