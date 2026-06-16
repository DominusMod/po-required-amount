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
      <div>
        <div className="section-label">Step 1 — Wallet</div>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>
          Enter a Stellar public key. The balance is fetched from Horizon
          but never sent off-device after that.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="stack-sm">
        <div className="field">
          <label className="field-label" htmlFor="pubkey">
            Stellar Public Key
          </label>
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
            autoCorrect="off"
          />
          {showError && (
            <span className="field-hint error">
              Invalid Stellar public key (must start with G, 56 chars)
            </span>
          )}
          {!showError && (
            <span className="field-hint">
              Only USDC balance is read. Your key stays client-side.
            </span>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={loading || !key}
        >
          {loading ? (
            <>
              <SpinIcon />
              Fetching balance…
            </>
          ) : (
            "Fetch USDC Balance"
          )}
        </button>
      </form>

      <div className="callout">
        <span>⚠</span>
        <span>
          Testnet only. Fund your account with Friendbot if balance shows zero.{" "}
          <a
            href="https://friendbot.stellar.org"
            target="_blank"
            rel="noreferrer"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            friendbot.stellar.org
          </a>
        </span>
      </div>
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
