# po-required-amount

> **ZK Proof-of-Balance for Stellar** — Real-World ZK Hackathon (DoraHacks, June 2026)

Prove your Stellar wallet holds ≥ X USDC without revealing the exact balance.
Built with Noir ZK circuits, Barretenberg UltraHonk proofs, and a Soroban verifier contract on Stellar testnet.

---

## How it works

```
User wallet (Horizon API)          Noir circuit (browser)        Soroban contract (testnet)
┌────────────────────┐            ┌──────────────────────┐      ┌─────────────────────────┐
│  Fetch USDC balance│──private──▶│ balance >= threshold? │─────▶│  verify_balance_proof() │
│  (stays in browser)│            │  UltraHonk proof      │      │  returns bool on-chain  │
└────────────────────┘            └──────────────────────┘      └─────────────────────────┘
                                       ↑ public input
                                       threshold (public)
```

**Privacy property**: The verifier (on-chain contract, third party) learns:
- The threshold (public input)
- Whether the proof is valid (`true`/`false`)
- Nothing else — exact balance is never revealed

---

## Stack

| Layer | Technology |
|-------|-----------|
| ZK Circuit | [Noir](https://noir-lang.org/) `>=0.32` · `balance >= threshold` range proof |
| Proof backend | [Barretenberg](https://github.com/AztecProtocol/barretenberg) UltraHonk |
| Blockchain | [Stellar](https://stellar.org) testnet · [Soroban](https://soroban.stellar.org) smart contracts |
| Balance API | [Stellar Horizon](https://horizon-testnet.stellar.org) (USDC asset) |
| Frontend | Next.js 14 · React 18 · TypeScript |
| UI style | Flat Dashboard — Linear/Vercel aesthetic |

---

## Quickstart

### Prerequisites

```bash
# Node.js 20+
node --version

# Rust + cargo (for Soroban contract)
rustc --version

# Install Noir toolchain
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup   # installs nargo

# Install Stellar CLI
cargo install stellar-cli --features opt

# Install Soroban target
rustup target add wasm32-unknown-unknown
```

### 1. Compile the ZK circuit

```bash
cd circuits
nargo compile
# Produces circuits/target/balance_proof.json
# Copy to frontend:
cp target/balance_proof.json ../frontend/circuits/target/
```

Run circuit tests:
```bash
nargo test
# test_proof_passes ... ok
# test_proof_fails ... ok (expected fail)
# test_exact_match ... ok
# test_zero_threshold ... ok
```

### 2. Build & deploy the Soroban contract

```bash
cd contracts/verifier

# Build
cargo build --target wasm32-unknown-unknown --release

# Optimize
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/balance_verifier.wasm

# Deploy to testnet (requires funded account)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/balance_verifier.optimized.wasm \
  --source YOUR_SECRET_KEY \
  --network testnet

# Note the contract ID, then initialize:
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source YOUR_SECRET_KEY \
  --network testnet \
  -- initialize --vk <VK_BYTES_HEX>
```

Get the verification key:
```bash
cd circuits
bb write_vk -b target/balance_proof.json -o target/vk
xxd -p target/vk | tr -d '\n'  # hex encode for --vk argument
```

### 3. Run the frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local — set NEXT_PUBLIC_VERIFIER_CONTRACT_ID=<your contract ID>

npm install
npm run dev
# → http://localhost:3000
```

---

## Project structure

```
po-required-amount/
├── circuits/
│   ├── src/main.nr          # Noir ZK circuit: proves balance >= threshold
│   ├── Nargo.toml
│   └── target/
│       └── balance_proof.json   # compiled circuit (git-ignored until compiled)
│
├── contracts/verifier/
│   ├── src/lib.rs           # Soroban verifier contract
│   └── Cargo.toml
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Main proof flow orchestrator
│   │   └── globals.css      # Flat Dashboard design system
│   │
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── WalletInput.tsx  # Public key entry + balance fetch
│   │   ├── BalancePanel.tsx # Fetched balance display
│   │   ├── ThresholdInput.tsx  # Required amount setter
│   │   ├── ProofPipeline.tsx   # 4-step proof generation pipeline
│   │   └── ResultPanel.tsx     # Final verified/rejected result
│   │
│   ├── lib_stellar/
│   │   └── horizon.ts       # Horizon API: USDC balance fetch
│   │
│   ├── lib_zk/
│   │   └── prover.ts        # Noir/Barretenberg proof generation
│   │
│   └── lib_soroban/
│       └── verifier.ts      # Soroban contract interaction
│
├── Cargo.toml               # Workspace
└── README.md
```

---

## ZK Circuit

`circuits/src/main.nr`:
```noir
fn main(balance: u64, threshold: pub u64) {
    assert(balance >= threshold, "Balance is below required threshold");
}
```

- **Private input**: `balance` (wallet's USDC balance in cents — never leaves browser)
- **Public input**: `threshold` (the minimum required amount)
- **Constraint**: balance ≥ threshold

Compile with `nargo compile`, prove with Barretenberg UltraHonk backend.

---

## Wallet integration (Freighter)

To add browser wallet signing, install Freighter:

```bash
npm install @stellar/freighter-api
```

In `lib_soroban/verifier.ts`, replace the signing stub:
```typescript
import { signTransaction } from "@stellar/freighter-api";
// replace the signTransaction stub in verifyProofOnChain
```

---

## Roadmap

- [ ] Compile Noir circuit (`nargo compile`)
- [ ] Deploy Soroban contract to testnet
- [ ] Integrate Freighter wallet for transaction signing
- [ ] Embed actual BB verifier (replace scaffold in contract)
- [ ] Generate & store verification key on-chain
- [ ] Add USDC amount gating demo (proof gate for access control)
- [ ] Mainnet deployment

---

## Privacy notes

1. The Horizon API call reveals the public key to Stellar's servers (public blockchain data)
2. The balance is fetched once and kept only in browser memory
3. The ZK proof reveals only: the threshold and proof validity
4. No backend server — all proof generation is client-side WASM

---

## Hackathon

**Real-World ZK on Stellar** · DoraHacks · Deadline June 29, 2026 · Prize $10,000

Built by [@DominusMod](https://github.com/DominusMod)
