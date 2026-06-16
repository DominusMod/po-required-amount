//! contracts/verifier/src/lib.rs
//! Soroban ZK Verifier Contract for po-required-amount
//!
//! Verifies a Noir UltraHonk proof that proves balance >= threshold.
//! The verifier logic here is a scaffold; the actual Barretenberg
//! verification must be compiled to WASM/native and called via Soroban's
//! host functions or a pre-compiled verifier key.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, log,
    Bytes, BytesN, Env, Vec,
};

/// Verification key for the balance_proof circuit.
/// Replace with the actual VK bytes from `bb write_vk` after compiling the circuit.
const CIRCUIT_VK_PLACEHOLDER: &[u8] = b"VK_PLACEHOLDER_REPLACE_WITH_ACTUAL_VK";

#[contracttype]
pub enum DataKey {
    VerificationKey,
    ProofCount,
}

#[contract]
pub struct BalanceVerifierContract;

#[contractimpl]
impl BalanceVerifierContract {
    /// Initialize the contract with the circuit verification key.
    /// Must be called once after deployment.
    pub fn initialize(env: Env, vk: Bytes) {
        env.storage().persistent().set(&DataKey::VerificationKey, &vk);
        env.storage().persistent().set(&DataKey::ProofCount, &0u64);
        log!(&env, "BalanceVerifier initialized");
    }

    /// Verify a ZK proof that proves wallet_balance >= threshold.
    ///
    /// # Arguments
    /// * `proof`         - UltraHonk proof bytes (from Barretenberg backend)
    /// * `public_inputs` - Vec of public input bytes [threshold_as_field_element]
    /// * `threshold`     - The required minimum balance in cents (redundant check)
    ///
    /// # Returns
    /// `true` if the proof is valid, `false` otherwise.
    pub fn verify_balance_proof(
        env: Env,
        proof: Bytes,
        public_inputs: Vec<Bytes>,
        threshold: u64,
    ) -> bool {
        // Retrieve the stored verification key
        let vk: Bytes = env
            .storage()
            .persistent()
            .get(&DataKey::VerificationKey)
            .unwrap_or_else(|| Bytes::from_slice(&env, CIRCUIT_VK_PLACEHOLDER));

        // ── Barretenberg UltraHonk verification ──────────────────────────
        // In production, this calls the actual BB verifier.
        // Two implementation paths:
        //
        // Path A (recommended): Embed the verifier as a Soroban WASM contract
        //   compiled from the `bb` C++ toolchain's Solidity/native verifier.
        //   The `bb` CLI generates a verifier contract; adapt to Soroban.
        //
        // Path B (current scaffold): Call env.crypto() host functions for
        //   the pairing operations once Stellar adds BN254/Grumpkin support.
        //
        // For the hackathon demo, we perform structural validation of the
        // proof bytes and public inputs, then trust local verification.
        // ─────────────────────────────────────────────────────────────────

        // Structural checks
        if proof.len() < 32 {
            log!(&env, "Proof too short: {}", proof.len());
            return false;
        }

        if public_inputs.is_empty() {
            log!(&env, "No public inputs provided");
            return false;
        }

        // Verify threshold encoding in public inputs
        // First public input should encode the threshold field element
        let threshold_input = public_inputs.get(0).unwrap();
        if threshold_input.len() != 32 {
            log!(&env, "Invalid public input length");
            return false;
        }

        // Extract threshold from field element (last 8 bytes = u64, big-endian)
        let mut threshold_bytes = [0u8; 8];
        for i in 0..8usize {
            threshold_bytes[i] = threshold_input.get((24 + i) as u32).unwrap_or(0);
        }
        let encoded_threshold = u64::from_be_bytes(threshold_bytes);

        if encoded_threshold != threshold {
            log!(
                &env,
                "Threshold mismatch: proof={}, arg={}",
                encoded_threshold,
                threshold
            );
            return false;
        }

        // Increment proof counter
        let count: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::ProofCount)
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::ProofCount, &(count + 1));

        // TODO: Replace with actual BB verifier call
        // For now, emit an event and return true for structurally valid proofs
        // Production: integrate bb_verifier crate or WASM-compiled verifier
        log!(&env, "Proof #{} accepted for threshold {}", count + 1, threshold);

        true // Scaffold: real cryptographic verification required for production
    }

    /// Get the number of proofs verified by this contract.
    pub fn proof_count(env: Env) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::ProofCount)
            .unwrap_or(0)
    }

    /// Check if the verification key is set.
    pub fn has_vk(env: Env) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::VerificationKey)
    }
}
