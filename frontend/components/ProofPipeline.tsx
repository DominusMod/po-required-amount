"use client";
import type { ZKProof } from "../lib_zk/prover";

type StepStatus = "idle" | "working" | "done" | "error";

export interface PipelineState {
  witness:  StepStatus;
  proof:    StepStatus;
  verify:   StepStatus;
  anchor:   StepStatus;
  zkProof:  ZKProof | null;
  error:    string | null;
  localVerified: boolean | null;
  txHash:   string | null;
}

export default function ProofPipeline({
  state,
  thresholdUSD,
}: {
  state: PipelineState;
  thresholdUSD: number;
}) {
  const steps = [
    {
      key:    "witness" as const,
      num:    1,
      title:  "Execute circuit",
      desc:   "Circom circuit runs in your browser and computes the witness",
      detail: state.witness === "done" ? "Witness generated" : state.error ?? "",
    },
    {
      key:    "proof" as const,
      num:    2,
      title:  "Generate proof",
      desc:   "snarkjs produces the Groth16 cryptographic proof",
      detail: state.zkProof ? `${state.zkProof.proofHex.slice(0, 40)}…` : state.error ?? "",
    },
    {
      key:    "verify" as const,
      num:    3,
      title:  "Verify proof",
      desc:   `Proof verified locally against the $${thresholdUSD.toFixed(2)} USDC threshold`,
      detail:
        state.localVerified === true  ? "Passed — balance meets threshold" :
        state.localVerified === false ? "Failed — balance below threshold" : "",
    },
    {
      key:    "anchor" as const,
      num:    4,
      title:  "Anchor on-chain",
      desc:   "Proof hash anchored to Stellar testnet via Soroban contract",
      detail:
        state.txHash
          ? `tx: ${state.txHash.slice(0, 16)}…`
          : state.anchor === "error"
          ? (state.error ?? "")
          : "",
    },
  ];

  return (
    <div className="card">
      <div className="step-indicator" style={{ marginBottom: 4 }}>
        <div className="step-num">4</div>
        <div className="step-title">Generating &amp; anchoring your proof</div>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
        Proof runs in your browser. Only the proof hash is anchored on-chain — your balance is never revealed.
      </p>
      <div className="pipeline">
        {steps.map((step) => {
          const status = state[step.key];
          return (
            <div className="pipeline-step" key={step.key}>
              <div className={`pipeline-icon ${status}`}>
                {status === "done"    ? <Check /> :
                 status === "error"   ? <X /> :
                 status === "working" ? <Spin /> :
                 step.num}
              </div>
              <div className="pipeline-body">
                <div className="pipeline-title">{step.title}</div>
                <div className="pipeline-desc">{step.desc}</div>
                {status !== "idle" && step.detail && (
                  <div className="pipeline-detail">{step.detail}</div>
                )}
              </div>
              <Badge status={status} />
            </div>
          );
        })}
      </div>

      {state.zkProof && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6, fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
            PROOF BYTES
          </div>
          <div className="proof-box">{state.zkProof.proofHex}</div>
        </div>
      )}

      {state.txHash && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6, fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
            STELLAR TX
          </div>
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${state.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="proof-box"
            style={{ display: "block", color: "var(--purple)", textDecoration: "none" }}
          >
            {state.txHash}
          </a>
        </div>
      )}
    </div>
  );
}

function Badge({ status }: { status: "idle" | "working" | "done" | "error" }) {
  const map = {
    idle:    ["badge-idle",    "pending"],
    working: ["badge-working", "running"],
    done:    ["badge-success", "done"],
    error:   ["badge-error",   "failed"],
  };
  const [cls, label] = map[status];
  return (
    <span className={`badge ${cls}`} style={{ flexShrink: 0 }}>
      <span className="badge-dot" />
      {label}
    </span>
  );
}

function Check() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function X() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 3l7 7M10 3l-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}
function Spin() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="8"/>
    </svg>
  );
}
