"use client";
import type { BalanceResult } from "../lib_stellar/horizon";

interface BalancePanelProps {
  result: BalanceResult;
  publicKey: string;
}

export default function BalancePanel({ result, publicKey }: BalancePanelProps) {
  const short = `${publicKey.slice(0, 8)}…${publicKey.slice(-6)}`;
  return (
    <div className="card stack-md">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="section-label" style={{ marginBottom: 0 }}>Balance confirmed</div>
        <span className="badge badge-success"><span className="badge-dot" />Live from Horizon</span>
      </div>
      <div className="grid-3">
        <div className="metric purple">
          <div className="metric-label">USDC Balance</div>
          <div className="metric-value accent">${result.balanceUnits.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="metric-sub">USDC</div>
        </div>
        <div className="metric blue">
          <div className="metric-label">Circuit input</div>
          <div className="metric-value blue" style={{ fontSize: 17 }}>{result.balanceCents.toString()}</div>
          <div className="metric-sub">cents · private u64</div>
        </div>
        <div className="metric teal">
          <div className="metric-label">Wallet</div>
          <div className="metric-value" style={{ fontSize: 13, color: "var(--teal)" }}>{short}</div>
          <div className="metric-sub">Stellar</div>
        </div>
      </div>
      <div className="stack-sm">
        <div className="info-row"><span className="info-key">Asset</span><span className="info-val accent">{result.assetCode} · {result.issuer.slice(0, 10)}…</span></div>
        <div className="info-row"><span className="info-key">Raw balance</span><span className="info-val">{result.balance}</span></div>
        <div className="info-row"><span className="info-key">Privacy</span><span className="info-val green">Balance stays in your browser only</span></div>
      </div>
    </div>
  );
}
