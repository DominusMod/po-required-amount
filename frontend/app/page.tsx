"use client";

import { useState, useCallback, useEffect } from "react";
import Header from "../components/Header";
import WalletInput from "../components/WalletInput";
import BalancePanel from "../components/BalancePanel";
import ThresholdInput from "../components/ThresholdInput";
import OwnershipProof from "../components/OwnershipProof";
import ProofPipeline, { PipelineState } from "../components/ProofPipeline";
import ResultPanel from "../components/ResultPanel";
import { fetchStellarUSDCBalance, BalanceResult } from "../lib_stellar/horizon";
import { generateBalanceProof, verifyBalanceProofLocal } from "../lib_zk/prover";

// Phases:
//  input           → user enters wallet address
//  balance-fetched → balance shown, threshold input visible
//  ownership       → OwnershipProof component visible; threshold staged but proof not yet running
//  proving         → proof pipeline running (triggered by useEffect after ownership confirmed)
//  done            → proof complete
type AppPhase = "input" | "balance-fetched" | "ownership" | "proving" | "done";

const INITIAL_PIPELINE: PipelineState = {
  witness: "idle", proof: "idle", verify: "idle",
  zkProof: null, error: null,
  localVerified: null,
};

function useCounter(target: number, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

export default function HomePage() {
  const [phase, setPhase]               = useState<AppPhase>("input");
  const [fetchingBalance, setFetching]  = useState(false);
  const [balanceResult, setBalance]     = useState<BalanceResult | null>(null);
  const [publicKey, setPublicKey]       = useState("");
  const [thresholdUSD, setThresholdUSD] = useState(0);
  const [pipeline, setPipeline]         = useState<PipelineState>(INITIAL_PIPELINE);

  // Staged threshold values — set by ThresholdInput, consumed by proof run
  const [stagedThresholdCents, setStagedThresholdCents] = useState<bigint>(0n);
  const [stagedThresholdUSD,   setStagedThresholdUSD]   = useState(0);

  // signFn provided by OwnershipProof after Freighter sign — passed to verifyProofOnChain
  const [signFn, setSignFn] = useState<((xdr: string) => Promise<string>) | null>(null);

  // ─── Step 1: fetch balance ────────────────────────────────────────────────
  const handleFetchBalance = useCallback(async (key: string) => {
    setFetching(true);
    setPublicKey(key);
    try {
      setBalance(await fetchStellarUSDCBalance(key));
      setPhase("balance-fetched");
    } catch (err: unknown) {
      alert(`Balance fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setFetching(false);
    }
  }, []);

  // ─── Step 2: threshold staged — reveal ownership step ────────────────────
  // ThresholdInput now calls this instead of launching the proof directly.
  const handleStageThreshold = useCallback((thresholdCents: bigint, thresholdUSDVal: number) => {
    setStagedThresholdCents(thresholdCents);
    setStagedThresholdUSD(thresholdUSDVal);
    setThresholdUSD(thresholdUSDVal);
    setPhase("ownership");
  }, []);

  // ─── Step 3: ownership confirmed — store signFn and move to proving ───────
  const handleOwnershipSigned = useCallback(
    (
      _signerAddress: string,
      freighterSignFn: (xdr: string) => Promise<string>
    ) => {
      // Store the sign function in state.
      // NOTE: useState setter with a function value requires wrapping in an arrow
      // to prevent React from calling it as an updater function.
      setSignFn(() => freighterSignFn);
      setPhase("proving");
    },
    []
  );

  const handleOwnershipError = useCallback((msg: string) => {
    // Stay on ownership phase so user can retry; error is shown inside OwnershipProof
    console.error("Ownership proof error:", msg);
  }, []);

  // ─── Step 4: run proof pipeline once phase = proving ─────────────────────
  useEffect(() => {
    if (phase !== "proving" || !balanceResult || !signFn) return;

    let cancelled = false;

    async function runProof() {
      if (!balanceResult) return;

      setPipeline(INITIAL_PIPELINE);
      setPipeline((p) => ({ ...p, witness: "working" }));

      let zkProof;
      try {
        zkProof = await generateBalanceProof({
          balance: balanceResult.balanceCents,
          threshold: stagedThresholdCents,
        });
        if (cancelled) return;
        setPipeline((p) => ({ ...p, witness: "done", proof: "working" }));
      } catch (err: unknown) {
        if (cancelled) return;
        setPipeline((p) => ({
          ...p,
          witness: "error",
          error: err instanceof Error ? err.message : String(err),
        }));
        setPhase("balance-fetched");
        return;
      }

      setPipeline((p) => ({ ...p, proof: "done", zkProof, verify: "working" }));

      try {
        const localOk = await verifyBalanceProofLocal(zkProof);
        if (cancelled) return;
        setPipeline((p) => ({
          ...p,
          verify: localOk ? "done" : "error",
          localVerified: localOk,
          error: localOk ? null : "Proof verification failed — balance does not meet threshold",
        }));
        setPhase("done");
      } catch (err: unknown) {
        if (cancelled) return;
        setPipeline((p) => ({
          ...p,
          verify: "error",
          localVerified: false,
          error: err instanceof Error ? err.message : String(err),
        }));
        setPhase("done");
      }
    }

    runProof();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, signFn]);

  // ─── Reset ────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setPhase("input");
    setBalance(null);
    setPublicKey("");
    setPipeline(INITIAL_PIPELINE);
    setThresholdUSD(0);
    setStagedThresholdCents(0n);
    setStagedThresholdUSD(0);
    setSignFn(null);
  }, []);

  return (
    <>
      <Header />
      <main className="main">
        <div className="stack-lg">

          {/* Hero */}
          <div className="hero">
            <div className="hero-eyebrow">Zero-Knowledge Proof of Balance</div>
            <h1 className="hero-title">
              Prove your balance.<br />
              <span>Reveal nothing.</span>
            </h1>
            <p className="hero-sub">
              Cryptographically prove your Stellar wallet holds at least X USDC —
              without exposing your exact balance to anyone, ever.
            </p>
            <div className="hero-stats">
              <div className="hero-stat">
                <div className="hero-stat-val purple"><AnimCount target={100} />%</div>
                <div className="hero-stat-label">Cryptographically private</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-val blue"><AnimCount target={3} /> steps</div>
                <div className="hero-stat-label">From wallet to proof</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-val green">$<AnimCount target={0} /> exposed</div>
                <div className="hero-stat-label">Balance data revealed</div>
              </div>
            </div>
          </div>

          {/* Step 1 — wallet input (hide once we're past ownership) */}
          {(phase === "input" || phase === "balance-fetched") && (
            <WalletInput onFetchBalance={handleFetchBalance} loading={fetchingBalance} />
          )}

          {/* Balance panel — visible from balance-fetched onwards */}
          {balanceResult && phase !== "input" && (
            <BalancePanel result={balanceResult} publicKey={publicKey} />
          )}

          {/* Step 2 — threshold (only while balance fetched and not yet in ownership) */}
          {phase === "balance-fetched" && balanceResult && (
            <ThresholdInput
              balanceUnits={balanceResult.balanceUnits}
              onGenerateProof={handleStageThreshold}
              loading={false}
              disabled={false}
            />
          )}

          {/* Step 3 — ownership proof via Freighter */}
          {phase === "ownership" && (
            <OwnershipProof
              expectedPublicKey={publicKey}
              thresholdUSD={stagedThresholdUSD}
              onSigned={handleOwnershipSigned}
              onError={handleOwnershipError}
            />
          )}

          {/* Step 4 — proof pipeline */}
          {(phase === "proving" || phase === "done") && (
            <ProofPipeline state={pipeline} thresholdUSD={thresholdUSD} />
          )}

          {/* Result */}
          {phase === "done" && (
            <ResultPanel
              verified={pipeline.localVerified === true}
              thresholdUSD={thresholdUSD}
              onReset={handleReset}
            />
          )}

        </div>
      </main>
    </>
  );
}

function AnimCount({ target }: { target: number }) {
  const v = useCounter(target);
  return <>{v}</>;
}
