"use client";
import { useState } from "react";
import { isValidStellarPublicKey } from "../lib_stellar/horizon";

interface WalletInputProps {
  onFetchBalance: (publicKey: string) => void;
  loading: boolean;
}

export default function WalletInput({ onFetchBalance, loading }: WalletInputProps) {
  const [key, setKey] = useState("");
  const [touched, setTouched] = useState(false);
  const isValid = isValidStellarPublicKey(key);
  const showError = touched && key.length > 0 && !isValid;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (isValid) onFetchBalance(key.trim());
  }

  return (
    <div className="card stack-md">
      <div className="step-indicator">
        <div className="step-num">1</div>
        <div className="step-title">Enter your wallet address</div>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: -8 }}>
        Your USDC balance is fetched directly from Stellar and stays in your browser. Nothing is sent to any server.
      </p>
      <form onSubmit={handleSubmit} className="stack-md">
        <div className="field">
          <label className="field-label" htmlFor="pubkey">Stellar Public Key</label>
          <input
            id="pubkey"
            className={`input ${showError ? "error" : ""}`}
            type="text"
            placeholder="GABC...XYZ"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onBlur={() => setTouched(true)}
            spellCheck={false}
            autoComplete="off"
          />
          {showError
            ? <span className="field-hint error">Must start with G and be 56 characters</span>
            : <span className="field-hint">Starts with G · 56 characters · only your USDC balance is read</span>
          }
        </div>
        <button type="submit" className="btn btn-primary btn-full" disabled={loading || !key}>
          {loading ? <><Spinner /> Fetching balance…</> : "Fetch USDC Balance"}
        </button>
      </form>
      <div className="callout">
        <span>Testnet only — fund your account free at</span>
        <a href="https://friendbot.stellar.org" target="_blank" rel="noreferrer" style={{ color: "inherit", fontWeight: 600, marginLeft: 4 }}>
          friendbot.stellar.org
        </a>
      </div>
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
