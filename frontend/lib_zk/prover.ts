/**
 * lib_zk/prover.ts
 * ZK Proof generation using Circom + snarkjs Groth16
 *
 * Circuit: circuits/balance_check.circom
 * Proves: balance >= threshold WITHOUT revealing balance
 *
 * In DEMO_MODE (page.tsx = true), these functions are never called.
 * Flip DEMO_MODE to false once Soroban contract is deployed.
 */

export interface ProofInputs {
  balance: bigint;
  threshold: bigint;
}

export interface ZKProof {
  proof: Uint8Array;
  publicInputs: string[];
  proofHex: string;
  // snarkjs proof object for on-chain verification
  snarkProof: SnarkProof;
  snarkPublic: string[];
}

export interface SnarkProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
}

// Lazy-loaded snarkjs — only imported when real mode is active
let snarkjs: typeof import("snarkjs") | null = null;

async function loadSnarkjs() {
  if (!snarkjs) {
    snarkjs = await import("snarkjs");
  }
  return snarkjs;
}

// Fetch a file from /public/circuits/ as ArrayBuffer
async function fetchCircuitFile(filename: string): Promise<Uint8Array> {
  const res = await fetch(`/circuits/${filename}`);
  if (!res.ok) throw new Error(`Failed to load ${filename}: ${res.status}`);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

// Fetch verification_key.json
async function fetchVerificationKey(): Promise<object> {
  const res = await fetch("/circuits/verification_key.json");
  if (!res.ok) throw new Error(`Failed to load verification_key.json: ${res.status}`);
  return res.json();
}

export async function generateBalanceProof(inputs: ProofInputs): Promise<ZKProof> {
  if (inputs.balance < 0n) throw new Error("Balance cannot be negative");
  if (inputs.threshold < 0n) throw new Error("Threshold cannot be negative");

  const sjs = await loadSnarkjs();

  // Inputs must be strings for snarkjs
  const circuitInputs = {
    balance: inputs.balance.toString(),
    threshold: inputs.threshold.toString(),
  };

  // Fetch the zkey file from /public/circuits/
  const zkeyBytes = await fetchCircuitFile("circuit_final.zkey");

  // Generate the proof — snarkjs handles witness internally via wasm
  const wasmBytes = await fetchCircuitFile("balance_check.wasm");

  const { proof, publicSignals } = await sjs.groth16.fullProve(
    circuitInputs,
    wasmBytes,
    zkeyBytes
  );

  // Convert proof to hex for display
  const proofHex = proofToHex(proof);

  // publicSignals[0] is the result (should be "1" for pass)
  const publicInputs = publicSignals.map((s: string) => "0x" + BigInt(s).toString(16).padStart(64, "0"));

  // Encode proof as Uint8Array for compatibility with ZKProof interface
  const proofBytes = hexToUint8Array(proofHex);

  return {
    proof: proofBytes,
    publicInputs,
    proofHex,
    snarkProof: proof as SnarkProof,
    snarkPublic: publicSignals,
  };
}

export async function verifyBalanceProofLocal(zkProof: ZKProof): Promise<boolean> {
  const sjs = await loadSnarkjs();
  const vKey = await fetchVerificationKey();

  const isValid = await sjs.groth16.verify(
    vKey,
    zkProof.snarkPublic,
    zkProof.snarkProof
  );

  return isValid;
}

export function usdToCents(usd: number): bigint {
  return BigInt(Math.round(usd * 100));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function proofToHex(proof: SnarkProof): string {
  const parts = [
    ...proof.pi_a.slice(0, 2),
    ...proof.pi_b[0],
    ...proof.pi_b[1],
    ...proof.pi_c.slice(0, 2),
  ];
  return parts
    .map((n) => BigInt(n).toString(16).padStart(64, "0"))
    .join("");
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
