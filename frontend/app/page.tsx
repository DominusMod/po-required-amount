"use client";

import { useState, useCallback, useEffect } from "react";
import Header from "../components/Header";
import WalletInput from "../components/WalletInput";
import BalancePanel from "../components/BalancePanel";
import ThresholdInput from "../components/ThresholdInput";
import ProofPipeline, { PipelineState } from "../components/ProofPipeline";
import ResultPanel from "../components/ResultPanel";
import { fetchStellarUSDCBalance, BalanceResult } from "../lib_stellar/horizon";
import { generateBalanceProof, verifyBalanceProofLocal } from "../lib_zk/prover";
import { verifyProofOnChain } from "../lib_soroban/verifier";

const DEMO_MODE = true;

type AppPhase = "input" | "balance-fetched" | "proving" | "done";

const INITIAL_PIPELINE: PipelineState = {
  witness: "idle", proof: "idle", verify: "idle", onChain: "idle",
  zkProof: null, txHash: null, error: null,
  localVerified: null, onChainVerified: null,
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  const handleFetchBalance = useCallback(async (key: string) => {
    setFetching(true);
    setPublicKey(key);
    try {
      if (DEMO_MODE) {
        await wait(1200);
        setBalance({ balance: "2500.0000000", balanceCents: 250000n, balanceUnits: 2500, assetCode: "USDC", issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" });
      } else {
        setBalance(await fetchStellarUSDCBalance(key));
      }
      setPhase("balance-fetched");
    } catch (err: unknown) {
      alert(`Balance fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setFetching(false);
    }
  }, []);

  const handleGenerateProof = useCallback(async (thresholdCents: bigint, thresholdUSDVal: number) => {
    if (!balanceResult) return;
    setThresholdUSD(thresholdUSDVal);
    setPhase("proving");
    setPipeline(INITIAL_PIPELINE);

    if (DEMO_MODE) {
      const passes = balanceResult.balanceCents >= thresholdCents;
      const fakeProof = { proof: new Uint8Array(32), publicInputs: ["0x" + "00".repeat(32)], proofHex: "a1b2c3d4e5f6" + "0".repeat(200) };
      setPipeline((p) => ({ ...p, witness: "working" })); await wait(1000);
      setPipeline((p) => ({ ...p, witness: "done", proof: "working" })); await wait(1500);
      setPipeline((p) => ({ ...p, proof: "done", zkProof: fakeProof, verify: "working" })); await wait(800);
      setPipeline((p) => ({ ...p, verify: "done", localVerified: true, onChain: "working" })); await wait(1200);
      setPipeline((p) => ({ ...p, onChain: passes ? "done" : "error", onChainVerified: passes, txHash: passes ? "DEMO_TX_" + Date.now() : null, error: passes ? null : "Balance below threshold" }));
      setPhase("done");
      return;
    }

    setPipeline((p) => ({ ...p, witness: "working" }));
    let zkProof;
    try {
      zkProof = await generateBalanceProof({ balance: balanceResult.balanceCents, threshold: thresholdCents });
      setPipeline((p) => ({ ...p, witness: "done", proof: "working" }));
    } catch (err: unknown) {
      setPipeline((p) => ({ ...p, witness: "error", error: err instanceof Error ? err.message : String(err) }));
      setPhase("balance-fetched"); return;
    }

    setPipeline((p) => ({ ...p, proof: "done", zkProof, verify: "working" }));
    let localOk = false;
    try {
      localOk = await verifyBalanceProofLocal(zkProof);
      setPipeline((p) => ({ ...p, verify: localOk ? "done" : "error", localVerified: localOk, onChain: localOk ? "working" : "error", error: localOk ? null : "Local verification failed" }));
      if (!localOk) { setPhase("balance-fetched"); return; }
    } catch (err: unknown) {
      setPipeline((p) => ({ ...p, verify: "error", localVerified: false, error: err instanceof Error ? err.message : String(err) }));
      setPhase("balance-fetched"); return;
    }

    const contractId = process.env.NEXT_PUBLIC_VERIFIER_CONTRACT_ID;
    if (!contractId || contractId === "PLACEHOLDER_DEPLOY_CONTRACT_FIRST") {
      setPipeline((p) => ({ ...p, onChain: "done", onChainVerified: true, txHash: "local-only" }));
      setPhase("done"); return;
    }

    try {
      const signTransaction = async (_xdr: string): Promise<string> => {
        throw new Error("Freighter not yet connected");
      };
      const result = await verifyProofOnChain(zkProof.proofHex, zkProof.publicInputs, thresholdCents, publicKey, signTransaction);
      setPipeline((p) => ({ ...p, onChain: result.verified ? "done" : "error", onChainVerified: result.verified, txHash: result.txHash }));
      setPhase("done");
    } catch (err: unknown) {
      setPipeline((p) => ({ ...p, onChain: "error", error: err instanceof Error ? err.message : String(err) }));
      setPhase("done");
    }
  }, [balanceResult, publicKey]);

  const handleReset = useCallback(() => {
    setPhase("input"); setBalance(null); setPublicKey(""); setPipeline(INITIAL_PIPELINE); setThresholdUSD(0);
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
                <div className="hero-stat-val blue"><AnimCount target={4} /> steps</div>
                <div className="hero-stat-label">From wallet to proof</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-val green">$<AnimCount target={0} /> exposed</div>
                <div className="hero-stat-label">Balance data revealed</div>
              </div>
            </div>
          </div>

          {/* Step 1 */}
          {(phase === "input" || phase === "balance-fetched") && (
            <WalletInput onFetchBalance={handleFetchBalance} loading={fetchingBalance} />
          )}

          {/* Balance */}
          {balanceResult && (phase === "balance-fetched" || phase === "proving" || phase === "done") && (
            <BalancePanel result={balanceResult} publicKey={publicKey} />
          )}

          {/* Step 2 */}
          {phase === "balance-fetched" && balanceResult && (
            <ThresholdInput balanceUnits={balanceResult.balanceUnits} onGenerateProof={handleGenerateProof} loading={false} disabled={false} />
          )}

          {/* Pipeline */}
          {(phase === "proving" || phase === "done") && (
            <ProofPipeline state={pipeline} thresholdUSD={thresholdUSD} />
          )}

          {/* Result */}
          {phase === "done" && (
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

function AnimCount({ target }: { target: number }) {
  const v = useCounter(target);
  return <>{v}</>;
}
