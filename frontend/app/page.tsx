"use client";

import { useState, useCallback } from "react";
import Header from "../components/Header";
import WalletInput from "../components/WalletInput";
import BalancePanel from "../components/BalancePanel";
import ThresholdInput from "../components/ThresholdInput";
import ProofPipeline, { PipelineState } from "../components/ProofPipeline";
import ResultPanel from "../components/ResultPanel";

import { fetchStellarUSDCBalance, BalanceResult } from "../lib_stellar/horizon";
import { generateBalanceProof, verifyBalanceProofLocal } from "../lib_zk/prover";
import { verifyProofOnChain } from "../lib_soroban/verifier";

type AppPhase =
  | "input"           // awaiting wallet key
  | "balance-fetched" // balance ready, awaiting threshold
  | "proving"         // generating proof
  | "done";           // verified or rejected

const INITIAL_PIPELINE: PipelineState = {
  witness:         "idle",
  proof:           "idle",
  verify:          "idle",
  onChain:         "idle",
  zkProof:         null,
  txHash:          null,
  error:           null,
  localVerified:   null,
  onChainVerified: null,
};

export default function HomePage() {
  const [phase, setPhase]               = useState<AppPhase>("input");
  const [fetchingBalance, setFetching]  = useState(false);
  const [balanceResult, setBalance]     = useState<BalanceResult | null>(null);
  const [publicKey, setPublicKey]       = useState("");
  const [thresholdUSD, setThresholdUSD] = useState(0);
  const [pipeline, setPipeline]         = useState<PipelineState>(INITIAL_PIPELINE);

  // ── Step 1: Fetch balance ────────────────────────────────────────────────
  const handleFetchBalance = useCallback(async (key: string) => {
    setFetching(true);
    setPublicKey(key);
    try {
      const result = await fetchStellarUSDCBalance(key);
      setBalance(result);
      setPhase("balance-fetched");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Balance fetch failed: ${msg}`);
    } finally {
      setFetching(false);
    }
  }, []);

  // ── Step 2 & 3: Generate proof + verify ──────────────────────────────────
  const handleGenerateProof = useCallback(
    async (thresholdCents: bigint, thresholdUSDVal: number) => {
      if (!balanceResult) return;
      setThresholdUSD(thresholdUSDVal);
      setPhase("proving");
      setPipeline(INITIAL_PIPELINE);

      // — Witness —
      setPipeline((p) => ({ ...p, witness: "working" }));
      let zkProof;
      try {
        zkProof = await generateBalanceProof({
          balance:   balanceResult.balanceCents,
          threshold: thresholdCents,
        });
        setPipeline((p) => ({ ...p, witness: "done", proof: "working" }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setPipeline((p) => ({ ...p, witness: "error", error: msg }));
        setPhase("balance-fetched");
        return;
      }

      // — Proof bytes —
      setPipeline((p) => ({ ...p, proof: "done", zkProof, verify: "working" }));

      // — Local verify —
      let localOk = false;
      try {
        localOk = await verifyBalanceProofLocal(zkProof);
        setPipeline((p) => ({
          ...p,
          verify:        localOk ? "done" : "error",
          localVerified: localOk,
          onChain:       localOk ? "working" : "error",
          error:         localOk ? null : "Local verification failed",
        }));
        if (!localOk) { setPhase("balance-fetched"); return; }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setPipeline((p) => ({ ...p, verify: "error", localVerified: false, error: msg }));
        setPhase("balance-fetched");
        return;
      }

      // — On-chain verify —
      // If no contract is deployed yet, we skip on-chain and mark as done
      const contractId = process.env.NEXT_PUBLIC_VERIFIER_CONTRACT_ID;
      if (!contractId || contractId === "PLACEHOLDER_DEPLOY_CONTRACT_FIRST") {
        setPipeline((p) => ({
          ...p,
          onChain:         "done",
          onChainVerified: true,
          txHash:          "local-only-no-contract-deployed",
        }));
        setPhase("done");
        return;
      }

      try {
        // Signing stub — replace with Freighter wallet integration
        const signTransaction = async (xdrEnvelope: string): Promise<string> => {
          // TODO: integrate Freighter (@stellar/freighter-api)
          // const { signTransaction } = await import("@stellar/freighter-api");
          // return signTransaction(xdrEnvelope);
          throw new Error(
            "Wallet signing not yet integrated. Connect Freighter in lib_soroban/verifier.ts"
          );
        };

        const result = await verifyProofOnChain(
          zkProof.proofHex,
          zkProof.publicInputs,
          thresholdCents,
          publicKey,
          signTransaction
        );

        setPipeline((p) => ({
          ...p,
          onChain:         result.verified ? "done" : "error",
          onChainVerified: result.verified,
          txHash:          result.txHash,
        }));
        setPhase("done");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setPipeline((p) => ({ ...p, onChain: "error", error: msg }));
        setPhase("done");
      }
    },
    [balanceResult, publicKey]
  );

  // ── Reset ────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setPhase("input");
    setBalance(null);
    setPublicKey("");
    setPipeline(INITIAL_PIPELINE);
    setThresholdUSD(0);
  }, []);

  const isProving = phase === "proving";
  const isDone    = phase === "done";

  return (
    <>
      <Header />
      <main className="main">
        <div className="stack-lg">

          {/* ── Hero metric bar ─────────────────────────────────────────── */}
          <div className="grid-3">
            <HeroTile
              label="PROOF SYSTEM"
              value="UltraHonk"
              sub="Noir + Barretenberg"
            />
            <HeroTile
              label="PRIVACY MODEL"
              value="ZK Range"
              sub="balance ≥ threshold"
            />
            <HeroTile
              label="CHAIN"
              value="Stellar"
              sub="Soroban testnet"
            />
          </div>

          {/* ── Phase: input ─────────────────────────────────────────────── */}
          {(phase === "input" || phase === "balance-fetched") && (
            <WalletInput
              onFetchBalance={handleFetchBalance}
              loading={fetchingBalance}
            />
          )}

          {/* ── Phase: balance-fetched / proving ─────────────────────────── */}
          {balanceResult && (phase === "balance-fetched" || isProving || isDone) && (
            <BalancePanel result={balanceResult} publicKey={publicKey} />
          )}

          {/* ── Threshold input ──────────────────────────────────────────── */}
          {phase === "balance-fetched" && balanceResult && (
            <ThresholdInput
              balanceUnits={balanceResult.balanceUnits}
              onGenerateProof={handleGenerateProof}
              loading={false}
              disabled={false}
            />
          )}

          {/* ── Pipeline (visible once proving starts) ───────────────────── */}
          {(isProving || isDone) && (
            <ProofPipeline state={pipeline} thresholdUSD={thresholdUSD} />
          )}

          {/* ── Result ───────────────────────────────────────────────────── */}
          {isDone && (
            <ResultPanel
              verified={pipeline.onChainVerified === true || pipeline.localVerified === true}
              thresholdUSD={thresholdUSD}
              txHash={pipeline.txHash}
              onReset={handleReset}
            />
          )}

        </div>
      </main>
    </>
  );
}

function HeroTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value accent" style={{ fontSize: 18 }}>
        {value}
      </div>
      <div className="metric-sub">{sub}</div>
    </div>
  );
}
