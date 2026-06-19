"use client";
import { useState } from "react";
import { usdToCents } from "../lib_zk/prover";

interface ThresholdInputProps {
  balanceUnits: number;
  onGenerateProof: (thresholdCents: bigint, thresholdUSD: number) => void;
  loading: boolean;
  disabled: boolean;
}

const PRESETS = [100, 500, 1000, 5000, 10000];

export default function ThresholdInput({ balanceUnits, onGenerateProof, loading, disabled }: ThresholdInputProps) {
  const [thresholdStr, setThresholdStr] = useState("1000");
  const thresholdNum = parseFloat(thresholdStr) || 0;
  const thresholdCents = usdToCents(thresholdNum);
  const willPass = balanceUnits >= thresholdNum;

  return (
    <div className="card stack-md">
      <div className="step-indicator">
        <div className="step-num">2</div>
        <div className="step-title">Set the minimum amount to prove</div>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: -8 }}>
        The verifier will only learn whether your balance meets this number — not your actual balance.
      </p>
      <form onSubmit={(e) => { e.preventDefault(); if (thresholdNum > 0) onGenerateProof(thresholdCents, thresholdNum); }} className="stack-md">
        <div>
          <div className="field-label" style={{ marginBottom: 8 }}>Quick amounts (USDC)</div>
          <div className="presets">
            {PRESETS.map((p) => (
              <button key={p} type="button" className={`preset-btn ${thresholdStr === String(p) ? "active" : ""}`}
                onClick={() => setThresholdStr(String(p))} disabled={disabled}>
                ${p.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="threshold">Custom amount (USDC)</label>
          <input id="threshold" className="input" type="number" min="0.01" step="0.01"
            value={thresholdStr} onChange={(e) => setThresholdStr(e.target.value)} disabled={disabled} />
          <span className="field-hint">= {thresholdCents.toString()} cents · used as the public input to the circuit</span>
        </div>
        {!disabled && thresholdNum > 0 && (
          <div className={`prediction ${willPass ? "pass" : "fail"}`}>
            {willPass
              ? `Your $${balanceUnits.toFixed(2)} meets the $${thresholdNum.toFixed(2)} threshold — proof will pass`
              : `Your $${balanceUnits.toFixed(2)} is below $${thresholdNum.toFixed(2)} — proof will fail`}
          </div>
        )}
        <button type="submit" className="btn btn-primary btn-full" disabled={disabled || loading || thresholdNum <= 0}>
          {loading ? <><Spinner /> Generating proof…</> : "Generate Proof"}
        </button>
      </form>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="8" />
    </svg>
  );
}
