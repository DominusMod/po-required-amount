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

export default function ThresholdInput({
  balanceUnits,
  onGenerateProof,
  loading,
  disabled,
}: ThresholdInputProps) {
  const [thresholdStr, setThresholdStr] = useState("1000");
  const thresholdNum = parseFloat(thresholdStr) || 0;
  const thresholdCents = usdToCents(thresholdNum);
  const willPass = balanceUnits >= thresholdNum;

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (thresholdNum <= 0) return;
    onGenerateProof(thresholdCents, thresholdNum);
  }

  return (
    <div className="card stack-md">
      <div>
        <div className="section-label">Step 2 — Set Threshold</div>
        <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          The verifier only learns you hold ≥ this amount. Your exact balance
          is never revealed.
        </p>
      </div>

      <form onSubmit={handleGenerate} className="stack-md">
        {/* Preset buttons */}
        <div>
          <div className="field-label" style={{ marginBottom: 8 }}>
            Quick presets (USDC)
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className={`btn btn-ghost`}
                style={{
                  fontSize: 12,
                  padding: "5px 10px",
                  borderColor:
                    thresholdStr === String(p)
                      ? "var(--accent)"
                      : "var(--border)",
                  color:
                    thresholdStr === String(p)
                      ? "var(--accent)"
                      : "var(--text-secondary)",
                }}
                onClick={() => setThresholdStr(String(p))}
                disabled={disabled}
              >
                ${p.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="threshold">
            Custom threshold (USDC)
          </label>
          <input
            id="threshold"
            className="input"
            type="number"
            min="0.01"
            step="0.01"
            value={thresholdStr}
            onChange={(e) => setThresholdStr(e.target.value)}
            disabled={disabled}
          />
          <span className="field-hint">
            = {thresholdCents.toString()} cents · public circuit input
          </span>
        </div>

        {/* Prediction */}
        {!disabled && thresholdNum > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              background: willPass
                ? "var(--green-dim)"
                : "var(--red-dim)",
              border: `1px solid ${willPass ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
            }}
          >
            <span style={{ fontSize: 16 }}>{willPass ? "✓" : "✗"}</span>
            <span
              style={{ color: willPass ? "var(--green)" : "var(--red)" }}
            >
              {willPass
                ? `Balance $${balanceUnits.toFixed(2)} ≥ threshold $${thresholdNum.toFixed(2)} — proof will pass`
                : `Balance $${balanceUnits.toFixed(2)} < threshold $${thresholdNum.toFixed(2)} — proof will fail`}
            </span>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={disabled || loading || thresholdNum <= 0}
        >
          {loading ? (
            <>
              <SpinIcon />
              Generating ZK Proof…
            </>
          ) : (
            "Generate ZK Proof"
          )}
        </button>
      </form>
    </div>
  );
}

function SpinIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="8" />
    </svg>
  );
}
