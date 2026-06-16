/**
 * lib_soroban/verifier.ts
 * Interact with the on-chain Soroban ZK Verifier contract (Stellar testnet)
 *
 * The Soroban contract exposes:
 *   fn verify_balance_proof(proof: Bytes, public_inputs: Vec<Bytes>, threshold: u64) -> bool
 *
 * We submit the proof via Stellar SDK and read the result.
 */

import {
  Contract,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  SorobanRpc,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";

export const SOROBAN_RPC_TESTNET = "https://soroban-testnet.stellar.org";
export const STELLAR_NETWORK_PASSPHRASE = Networks.TESTNET;

// Set this to your deployed contract ID after `stellar contract deploy`
export const VERIFIER_CONTRACT_ID =
  process.env.NEXT_PUBLIC_VERIFIER_CONTRACT_ID ??
  "PLACEHOLDER_DEPLOY_CONTRACT_FIRST";

export type VerificationStatus = "idle" | "submitting" | "confirmed" | "failed";

export interface OnChainVerifyResult {
  verified: boolean;
  txHash: string;
  ledger?: number;
}

/**
 * Call the Soroban verifier contract to verify the ZK proof on-chain.
 *
 * @param proofHex  - hex-encoded UltraHonk proof bytes
 * @param publicInputs - array of hex-encoded public inputs from Barretenberg
 * @param thresholdCents - threshold in cents (must match proof's public input)
 * @param callerKeypair - Stellar Keypair of the caller (signs the transaction)
 */
export async function verifyProofOnChain(
  proofHex: string,
  publicInputs: string[],
  thresholdCents: bigint,
  callerPublicKey: string,
  signTransaction: (xdrEnvelope: string) => Promise<string>
): Promise<OnChainVerifyResult> {
  const server = new SorobanRpc.Server(SOROBAN_RPC_TESTNET, {
    allowHttp: false,
  });

  const account = await server.getAccount(callerPublicKey);
  const contract = new Contract(VERIFIER_CONTRACT_ID);

  // Convert proof bytes
  const proofBytes = Buffer.from(proofHex, "hex");
  const proofScVal = nativeToScVal(proofBytes, { type: "bytes" });

  // Convert public inputs array
  const pubInputsScVal = xdr.ScVal.scvVec(
    publicInputs.map((pi) => {
      const piBytes = Buffer.from(pi.replace("0x", ""), "hex");
      return nativeToScVal(piBytes, { type: "bytes" });
    })
  );

  // Build transaction
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "verify_balance_proof",
        proofScVal,
        pubInputsScVal,
        nativeToScVal(thresholdCents, { type: "u64" })
      )
    )
    .setTimeout(30)
    .build();

  // Prepare (simulate) the transaction
  const preparedTx = await server.prepareTransaction(tx);
  const txXDR = preparedTx.toXDR();

  // Sign via wallet callback (Freighter or direct keypair)
  const signedXDR = await signTransaction(txXDR);

  // Submit
  const submitRes = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXDR, STELLAR_NETWORK_PASSPHRASE)
  );

  if (submitRes.status === "ERROR") {
    throw new Error(`Submit failed: ${JSON.stringify(submitRes.errorResult)}`);
  }

  // Poll for confirmation
  const txHash = submitRes.hash;
  let verified = false;
  let ledger: number | undefined;

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const status = await server.getTransaction(txHash);

    if (status.status === "SUCCESS") {
      // Parse return value
      const returnVal = status.returnValue;
      if (returnVal) {
        verified = scValToNative(returnVal) === true;
      }
      ledger = status.ledger;
      break;
    }
    if (status.status === "FAILED") {
      throw new Error(`Transaction failed on-chain: ${txHash}`);
    }
  }

  return { verified, txHash, ledger };
}

/** Simulate the verify call to estimate fees without submitting */
export async function simulateVerifyProof(
  proofHex: string,
  callerPublicKey: string
): Promise<{ fee: string; instructions: string }> {
  const server = new SorobanRpc.Server(SOROBAN_RPC_TESTNET);
  const account = await server.getAccount(callerPublicKey);
  const contract = new Contract(VERIFIER_CONTRACT_ID);

  const proofBytes = Buffer.from(proofHex, "hex");
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "verify_balance_proof",
        nativeToScVal(proofBytes, { type: "bytes" }),
        xdr.ScVal.scvVec([]),
        nativeToScVal(0n, { type: "u64" })
      )
    )
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationSuccess(sim)) {
    return {
      fee: sim.minResourceFee ?? "unknown",
      instructions: sim.cost?.cpuInsns?.toString() ?? "unknown",
    };
  }
  return { fee: "unknown", instructions: "unknown" };
}
