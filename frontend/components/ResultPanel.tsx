"use client";

interface ResultPanelProps {
  verified: boolean;
  thresholdUSD: number;
  txHash: string | null;
  ledger?: number;
  onReset: () => void;
}

export default function ResultPanel({ verified, thresholdUSD, txHash, ledger, onReset }: ResultPanelProps) {
  const explorerUrl = txHash && !txHash.startsWith("DEMO") && !txHash.startsWith("local")
    ? `https://stellar.expert/explorer/testnet/tx/${txHash}` : null;
  return (
    <div className={`result-panel ${verified ? "success" : "failure"}`}>
      <span className="result-icon">{verified ? "✅" : "❌"}</span>
      <div className={`result-title ${verified ? "green" : "red"}`}>
        {verified ? "Proof verified" : "Proof failed"}
      </div>
      <div className="result-sub" style={{ marginBottom: 28 }}>
        {verified
          ? `Wallet holds ≥ $${thresholdUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC · exact balance never revealed`
          : `Balance does not meet the $${thresholdUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC threshold`}
      </div>
      <div className="stack-sm" style={{ textAlign: "left", maxWidth: 440, margin: "0 auto 28px" }}>
        {txHash && (
          <div className="info-row">
            <span className="info-key">Transaction</span>
            <span className="info-val" style={{ fontSize: 12 }}>
              {explorerUrl
                ? <a href={explorerUrl} target="_blank" rel="noreferrer" style={{ color: "var(--purple)", textDecoration: "none" }}>{txHash.slice(0, 24)}… ↗</a>
                : txHash.slice(0, 24) + "…"}
            </span>
          </div>
        )}
        {ledger && <div className="info-row"><span className="info-key">Ledger</span><span className="info-val">{ledger.toLocaleString()}</span></div>}
        <div className="info-row"><span className="info-key">Network</span><span className="info-val">Stellar</span></div>
        <div className="info-row"><span className="info-key">Proof system</span><span className="info-val accent">Noir · UltraHonk · Barretenberg</span></div>
        <div className="info-row"><span className="info-key">Contract</span><span className="info-val">Soroban</span></div>
        <div className="info-row"><span className="info-key">Balance disclosed</span><span className="info-val green">None</span></div>
      </div>
      <button className="btn btn-secondary" onClick={onReset} style={{ minWidth: 160 }}>Start over</button>
    </div>
  );
}
