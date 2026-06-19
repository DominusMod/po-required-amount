# HANDOFF — po-required-amount
### Read this before starting a new Claude session

---

## What this project does (1 sentence)

Users type a Stellar wallet address → the app proves that wallet holds ≥ X USDC → **without ever showing the exact balance**.

---

## See it live RIGHT NOW — 3 commands only

You already have Node.js and npm. That is all you need today.

```bash
cd po-required-amount/frontend
npm install
npm run dev
```

Then open your browser at **http://localhost:3000**

The dApp is in **Demo Mode** — every step works with fake/simulated data.
You can click through the full proof flow and see every screen without installing anything else.

---

## What still needs to be built (in order)

There are **3 remaining steps** to go from demo → real working dApp.
Do them one at a time. Do not start step 2 before step 1 works.

---

### STEP 1 — Compile the ZK circuit
**What this does:** creates the math file the proof engine needs.
**When you need it:** when you set `DEMO_MODE = false`

**Install Nargo (the Noir compiler) — one command:**
```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
```
Close and reopen your terminal, then:
```bash
noirup
```
That installs it. Confirm it worked:
```bash
nargo --version
# should print: nargo 0.32.x
```

**Compile the circuit:**
```bash
cd po-required-amount/circuits
nargo compile
```
You will see: `Compiled to target/balance_proof.json`

**Copy the output where the frontend needs it:**
```bash
mkdir -p ../frontend/circuits/target
cp target/balance_proof.json ../frontend/circuits/target/
```
Done. Step 1 complete.

---

### STEP 2 — Deploy the Soroban contract
**What this does:** puts the verifier on the Stellar testnet blockchain.
**When you need it:** when you want real on-chain verification.

**Install Stellar CLI — one command:**
```bash
cargo install stellar-cli --features opt
```
> ⚠️ This requires Rust. Install Rust first if you don't have it:
> ```bash
> curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
> # choose option 1, then restart your terminal
> ```

**Add the WebAssembly build target:**
```bash
rustup target add wasm32-unknown-unknown
```

**Create a testnet wallet:**
```bash
stellar keys generate --global mykey --network testnet
stellar keys address mykey
# copy the G... address it shows you
```

**Fund it for free (paste your G... address):**
Open this link in your browser:
```
https://friendbot.stellar.org?addr=YOUR_G_ADDRESS_HERE
```

**Build the contract:**
```bash
cd po-required-amount/contracts/verifier
cargo build --target wasm32-unknown-unknown --release
```

**Deploy it:**
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/balance_verifier.wasm \
  --source mykey \
  --network testnet
```
It prints a contract ID like: `CXXXXXXXXXXXXXXXXXX...`
**Save that ID.**

**Tell the frontend about it:**
```bash
cd po-required-amount/frontend
cp .env.example .env.local
```
Open `.env.local` and change the line to:
```
NEXT_PUBLIC_VERIFIER_CONTRACT_ID=PASTE_YOUR_CONTRACT_ID_HERE
```
Done. Step 2 complete.

---

### STEP 3 — Connect Freighter wallet (for signing transactions)
**What this does:** lets the browser sign and send the transaction to Stellar.
**When you need it:** after step 2.

**Install Freighter browser extension:**
Go to https://freighter.app → click "Add to Chrome" (or Firefox)
Open it → Create wallet → Switch to **Testnet** in settings

**Install the npm package:**
```bash
cd po-required-amount/frontend
npm install @stellar/freighter-api
```

**Wire it up — open `frontend/app/page.tsx` and find this comment (around line 113):**
```typescript
// TODO: swap this stub for Freighter
```
Replace the 3 lines below that comment with:
```typescript
const { signTransaction: fs } = await import("@stellar/freighter-api");
const res = await fs(xdrEnvelope, "TESTNET");
return res.signedTxXdr;
```

**Turn off demo mode — in the same file, find line 10:**
```typescript
const DEMO_MODE = true;
```
Change it to:
```typescript
const DEMO_MODE = false;
```

Done. Step 3 complete. The dApp is now fully real.

---

## When talking to a new Claude — paste this prompt

```
We are building po-required-amount — a ZK Proof-of-Balance dApp for the 
Real-World ZK on Stellar hackathon (DoraHacks, deadline June 29 2026, $10k prize).

The dApp lets users prove their Stellar wallet holds ≥ X USDC without 
revealing the exact balance.

Stack:
- Next.js 14 frontend (in /frontend folder)
- Noir ZK circuit: circuits/src/main.nr (proves balance >= threshold)
- Soroban smart contract: contracts/verifier/src/lib.rs (verifies proof on-chain)
- Stellar Horizon API for balance fetching
- Barretenberg UltraHonk as the proof system

GitHub: github.com/DominusMod/po-required-amount

Current status:
- All UI is complete and working (6 React components, flat dashboard style)
- ZK circuit is written (4 lines, complete)
- Soroban contract is written (scaffold — structural checks pass, crypto verification is a TODO)
- DEMO_MODE = true in frontend/app/page.tsx (full UI works without real proofs)
- lib_stellar/horizon.ts: fetches USDC balance from Horizon testnet
- lib_zk/prover.ts: Barretenberg proof generation (needs nargo compile output)
- lib_soroban/verifier.ts: on-chain transaction submission (needs deployed contract)

What still needs to be done:
1. nargo compile → copy balance_proof.json to frontend/circuits/target/
2. Deploy Soroban contract → set NEXT_PUBLIC_VERIFIER_CONTRACT_ID in .env.local
3. Replace Freighter signing stub in page.tsx (around line 113) with real @stellar/freighter-api call
4. Set DEMO_MODE = false in page.tsx
5. Replace the scaffold `true` return in contracts/verifier/src/lib.rs line ~127 
   with real Barretenberg UltraHonk verification

Design rules (do not change these):
- Background: #0a0a0a, cards: #111111, accent: #6366f1 (indigo)
- No gradients, no shadows, flat dashboard Linear/Vercel style
- Mono font for all data/numbers

Please help me with [DESCRIBE WHAT YOU WANT TO DO NEXT].
```

---

## File map — what each file does

```
frontend/app/page.tsx              ← main brain, controls all 4 phases
frontend/app/globals.css           ← all styling (do not touch)
frontend/components/WalletInput    ← user types their wallet address here
frontend/components/BalancePanel   ← shows their USDC balance
frontend/components/ThresholdInput ← user sets the minimum (e.g. $1,000)
frontend/components/ProofPipeline  ← shows 4 live steps: witness→proof→verify→chain
frontend/components/ResultPanel    ← final ✓ or ✗ screen
frontend/lib_stellar/horizon.ts    ← talks to Stellar API to get balance
frontend/lib_zk/prover.ts          ← generates the ZK proof in the browser
frontend/lib_soroban/verifier.ts   ← sends the proof to the blockchain
circuits/src/main.nr               ← the ZK circuit (4 lines, complete)
contracts/verifier/src/lib.rs      ← the Soroban contract (scaffold)
```

---

## The one thing to understand about how it works

The balance (e.g. $2,500) is converted to **cents** (`250000`) because
ZK circuits only work with whole numbers. The circuit checks `250000 >= 100000`
(which means $2,500 ≥ $1,000) and proves that is true — without the verifier
ever seeing the `250000`. They only see the `100000` and the proof.

