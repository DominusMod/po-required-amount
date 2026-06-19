pragma circom 2.0.0;

include "node_modules/circomlib/circuits/comparators.circom";

/*
 * Sotisfy — ZK Proof of Balance
 *
 * Private inputs:
 *   balance  : the wallet's actual USDC balance in cents (e.g. 250000 = $2500.00)
 *
 * Public inputs:
 *   threshold : the minimum amount to prove, also in cents (e.g. 100000 = $1000.00)
 *
 * What this proves:
 *   balance >= threshold
 *   WITHOUT revealing the actual balance to anyone.
 */

template BalanceCheck() {

    // Private — only the prover knows this
    signal input balance;

    // Public — the verifier sets this
    signal input threshold;

    // Output — 1 if balance >= threshold, 0 if not
    signal output result;

    // Use circomlib's GreaterEqThan comparator
    // n = 64 bits — enough for any realistic USDC cent amount
    component gte = GreaterEqThan(64);

    gte.in[0] <== balance;
    gte.in[1] <== threshold;

    result <== gte.out;

    // Enforce the proof only passes when balance >= threshold
    result === 1;
}

component main { public [threshold] } = BalanceCheck();
