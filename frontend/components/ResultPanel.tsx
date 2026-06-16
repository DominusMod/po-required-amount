"use client";

interface ResultPanelProps {
  verified: boolean;
  thresholdUSD: number;
  txHash: string | null;
  ledger?: number;
  onReset: () => void;
}

export default function ResultPanel({
  verified,
  thresholdUSD,
  txHash,
  ledger,
  onReset,
}: ResultPanelProps) {
  const explorerUrl = txHash
    ? `https://stellar.expert/explorer/testnet/tx/${txHash}`
    : null;

  return (
    <div className={`result-panel ${verified ? "success" : "failure"}`}>
      <span className="result-icon">{verified ? "✓" : "✗"}</span>
      <div className={`result-title ${verified ? "green" : "red"}`}>
        {verified
          ? "Proof Verified On-Chain"
          : "Proof Rejected"}
      </div>
      <div className="result-sub" style={{ marginBottom: 20 }}>
        {verified
          ? `Wallet proven to hold ≥ $${thresholdUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC · balance never revealed`
          : `Wallet does not meet the $${thresholdUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC threshold`}
      </div>

      <div className="stack-sm" style={{ textAlign: "left", maxWidth: 480, margin: "0 auto 20px" }}>
        {txHash && (
          <div className="info-row">
            <span className="info-key">Transaction</span>
            <span className="info-val" style={{ fontSize: 11 }}>
              {explorerUrl ? (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--accent)", textDecoration: "none" }}
                >
                  {txHash.slice(0, 20)}…↗
                </a>
              ) : (
                txHash.slice(0, 20) + "…"
              )}
            </span>
          </div>
        )}
        {ledger && (
          <div className="info-row">
            <span className="info-key">Ledger</span>
            <span className="info-val">{ledger.toLocaleString()}</span>
          </div>
        )}
        <div className="info-row">
          <span className="info-key">Network</span>
          <span className="info-val">Stellar Testnet</span>
        </div>
        <div className="info-row">
          <span className="info-key">Proof system</span>
          <span className="info-val accent">Noir · UltraHonk · Barretenberg</span>
        </div>
        <div className="info-row">
          <span className="info-key">Verifier</span>
          <span className="info-val">Soroban Smart Contract</span>
        </div>
      </div>

      <button className="btn btn-secondary" onClick={onReset}>
        Start New Proof
      </button>
    </div>
  );
}
