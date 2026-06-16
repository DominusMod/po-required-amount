"use client";

import type { ZKProof } from "../lib_zk/prover";

type StepStatus = "idle" | "working" | "done" | "error";

export interface PipelineState {
  witness: StepStatus;
  proof: StepStatus;
  verify: StepStatus;
  onChain: StepStatus;
  zkProof: ZKProof | null;
  txHash: string | null;
  error: string | null;
  localVerified: boolean | null;
  onChainVerified: boolean | null;
}

interface ProofPipelineProps {
  state: PipelineState;
  thresholdUSD: number;
}

export default function ProofPipeline({ state, thresholdUSD }: ProofPipelineProps) {
  const steps = [
    {
      key: "witness" as const,
      title: "Execute Circuit",
      desc: "Run Noir circuit client-side to generate witness",
      detail:
        state.witness === "done"
          ? "Witness generated ✓"
          : state.witness === "error"
          ? state.error ?? "Error"
          : "Waiting…",
    },
    {
      key: "proof" as const,
      title: "Generate UltraHonk Proof",
      desc: "Barretenberg backend produces ZK proof bytes",
      detail:
        state.zkProof
          ? `Proof: ${state.zkProof.proofHex.slice(0, 32)}…`
          : state.proof === "error"
          ? state.error ?? "Error"
          : "Waiting…",
    },
    {
      key: "verify" as const,
      title: "Local Verify",
      desc: "Client-side sanity check before on-chain submission",
      detail:
        state.localVerified === true
          ? "Local verify: PASS ✓"
          : state.localVerified === false
          ? "Local verify: FAIL ✗"
          : "Waiting…",
    },
    {
      key: "onChain" as const,
      title: "On-Chain Verify (Soroban)",
      desc: `Submit proof to verifier contract · threshold: $${thresholdUSD.toFixed(2)} USDC`,
      detail:
        state.txHash
          ? `tx: ${state.txHash.slice(0, 18)}…`
          : state.onChain === "error"
          ? state.error ?? "Error"
          : "Waiting…",
    },
  ];

  return (
    <div className="card">
      <div className="section-label" style={{ marginBottom: 4 }}>
        Proof Pipeline
      </div>
      <p
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          marginBottom: 16,
        }}
      >
        All computation runs in your browser. Only the proof and public inputs
        touch the network.
      </p>
      <div className="pipeline">
        {steps.map((step, i) => {
          const status = state[step.key];
          return (
            <div className="pipeline-step" key={step.key}>
              <div className={`pipeline-icon ${status}`}>
                {status === "done" ? (
                  <CheckIcon />
                ) : status === "error" ? (
                  <XIcon />
                ) : status === "working" ? (
                  <SpinSVG />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <div className="pipeline-body">
                <div className="pipeline-title">{step.title}</div>
                <div className="pipeline-desc">{step.desc}</div>
                {status !== "idle" && (
                  <div className="pipeline-detail">{step.detail}</div>
                )}
              </div>
              <StatusBadge status={status} />
            </div>
          );
        })}
      </div>

      {/* Proof bytes output */}
      {state.zkProof && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginBottom: 6,
              fontFamily: "var(--font-mono)",
            }}
          >
            PROOF BYTES (hex)
          </div>
          <div className="proof-box">{state.zkProof.proofHex}</div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: StepStatus }) {
  const map = {
    idle:    { cls: "badge-idle",    label: "pending" },
    working: { cls: "badge-working", label: "running" },
    done:    { cls: "badge-success", label: "done" },
    error:   { cls: "badge-error",   label: "failed" },
  };
  const { cls, label } = map[status];
  return (
    <span className={`badge ${cls}`} style={{ flexShrink: 0 }}>
      <span className="badge-dot" />
      {label}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SpinSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="8" />
    </svg>
  );
}
