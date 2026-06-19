/**
 * lib_soroban/verifier.ts
 * Submit ZK proof to the Soroban verifier contract on Stellar testnet.
 *
 * Contract fn:
 *   verify_balance_proof(proof: Bytes, public_inputs: Vec<Bytes>, threshold: u64, submitter: Address) -> bool
 *
 * The contract:
 *   1. Validates proof is 256 bytes (Groth16 BN128)
 *   2. Validates result public input = 1
 *   3. Validates threshold field element matches `threshold` arg
 *   4. SHA-256 anchors the proof hash on-chain per submitter
 *   5. Emits a verified event
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
  Address,
} from "@stellar/stellar-sdk";

export const SOROBAN_RPC_TESTNET   = "https://soroban-testnet.stellar.org";
export const STELLAR_NETWORK_PASSPHRASE = Networks.TESTNET;

// Set after `stellar contract deploy` — paste the C... contract ID here
// or set NEXT_PUBLIC_VERIFIER_CONTRACT_ID in .env.local
export const VERIFIER_CONTRACT_ID =
  process.env.NEXT_PUBLIC_VERIFIER_CONTRACT_ID ?? "PLACEHOLDER_DEPLOY_CONTRACT_FIRST";

export interface OnChainVerifyResult {
  verified: boolean;
  txHash:   string;
  ledger?:  number;
}

/**
 * Submit the Groth16 proof to the Soroban verifier contract.
 *
 * @param proofHex        — hex-encoded 256-byte Groth16 proof
 * @param snarkPublic     — raw snarkjs public signals array (field element strings)
 * @param thresholdCents  — threshold in cents (must match proof's public input)
 * @param callerPublicKey — Stellar G-address of the submitter (Freighter account)
 * @param signTransaction — Freighter sign function from OwnershipProof
 */
export async function verifyProofOnChain(
  proofHex: string,
  snarkPublic: string[],
  thresholdCents: bigint,
  callerPublicKey: string,
  signTransaction: (xdrEnvelope: string) => Promise<string>
): Promise<OnChainVerifyResult> {
  const server = new SorobanRpc.Server(SOROBAN_RPC_TESTNET, { allowHttp: false });

  const account  = await server.getAccount(callerPublicKey);
  const contract = new Contract(VERIFIER_CONTRACT_ID);

  // Proof bytes — 256 bytes from hex
  const proofBytes   = Buffer.from(proofHex, "hex");
  const proofScVal   = nativeToScVal(proofBytes, { type: "bytes" });

  // Public inputs — each snarkjs signal is a decimal field element string.
  // Encode as 32-byte big-endian (field element canonical form).
  const pubInputsScVal = xdr.ScVal.scvVec(
    snarkPublic.map((signal) => {
      const bigVal  = BigInt(signal);
      const buf     = Buffer.alloc(32, 0);
      // Write as big-endian into the last bytes
      let tmp = bigVal;
      for (let i = 31; i >= 0 && tmp > 0n; i--) {
        buf[i] = Number(tmp & 0xffn);
        tmp >>= 8n;
      }
      return nativeToScVal(buf, { type: "bytes" });
    })
  );

  // Submitter address
  const submitterScVal = nativeToScVal(
    Address.fromString(callerPublicKey),
    { type: "address" }
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
        nativeToScVal(thresholdCents, { type: "u64" }),
        submitterScVal
      )
    )
    .setTimeout(30)
    .build();

  // Simulate
  const preparedTx = await server.prepareTransaction(tx);
  const txXDR      = preparedTx.toXDR();

  // Sign via Freighter
  const signedXDR = await signTransaction(txXDR);

  // Submit
  const submitRes = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXDR, STELLAR_NETWORK_PASSPHRASE)
  );

  if (submitRes.status === "ERROR") {
    throw new Error(`Submit failed: ${JSON.stringify(submitRes.errorResult)}`);
  }

  const txHash = submitRes.hash;
  let verified = false;
  let ledger: number | undefined;

  // Poll for confirmation (up to 40s)
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const status = await server.getTransaction(txHash);

    if (status.status === "SUCCESS") {
      const returnVal = status.returnValue;
      if (returnVal) verified = scValToNative(returnVal) === true;
      ledger = status.ledger;
      break;
    }
    if (status.status === "FAILED") {
      throw new Error(`Transaction failed on-chain: ${txHash}`);
    }
  }

  return { verified, txHash, ledger };
}
