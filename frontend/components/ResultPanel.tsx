"use client";

interface ResultPanelProps {
  verified: boolean;
  thresholdUSD: number;
  txHash: string | null;
  onReset: () => void;
}

export default function ResultPanel({ verified, thresholdUSD, txHash, onReset }: ResultPanelProps) {
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
        <div className="info-row">
          <span className="info-key">Network</span>
          <span className="info-val">Stellar (testnet)</span>
        </div>
        <div className="info-row">
          <span className="info-key">Proof system</span>
          <span className="info-val accent">Circom · snarkjs · Groth16</span>
        </div>
        <div className="info-row">
          <span className="info-key">Verification</span>
          <span className="info-val">Local + Soroban anchor</span>
        </div>
        <div className="info-row">
          <span className="info-key">Balance disclosed</span>
          <span className="info-val green">None</span>
        </div>
        {txHash && (
          <div className="info-row">
            <span className="info-key">On-chain tx</span>
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="info-val"
              style={{ color: "var(--purple)", fontFamily: "var(--font-mono)", fontSize: 11 }}
            >
              {txHash.slice(0, 12)}…{txHash.slice(-8)} ↗
            </a>
          </div>
        )}
      </div>
      <button className="btn btn-secondary" onClick={onReset} style={{ minWidth: 160 }}>
        Start over
      </button>
    </div>
  );
}
