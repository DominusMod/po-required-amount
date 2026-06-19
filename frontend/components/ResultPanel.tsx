"use client";

interface ResultPanelProps {
  verified: boolean;
  thresholdUSD: number;
  onReset: () => void;
}

export default function ResultPanel({ verified, thresholdUSD, onReset }: ResultPanelProps) {
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
        <div className="info-row"><span className="info-key">Network</span><span className="info-val">Stellar (testnet)</span></div>
        <div className="info-row"><span className="info-key">Proof system</span><span className="info-val accent">Circom · snarkjs · Groth16</span></div>
        <div className="info-row"><span className="info-key">Verification</span><span className="info-val">Local (off-chain)</span></div>
        <div className="info-row"><span className="info-key">Balance disclosed</span><span className="info-val green">None</span></div>
      </div>
      <button className="btn btn-secondary" onClick={onReset} style={{ minWidth: 160 }}>Start over</button>
    </div>
  );
}
