"use client";

import type { BalanceResult } from "../lib_stellar/horizon";

interface BalancePanelProps {
  result: BalanceResult;
  publicKey: string;
}

export default function BalancePanel({ result, publicKey }: BalancePanelProps) {
  const short = `${publicKey.slice(0, 6)}…${publicKey.slice(-6)}`;

  return (
    <div className="card stack-md">
      <div className="section-label">Balance Fetched</div>

      <div className="grid-3">
        <div className="metric">
          <div className="metric-label">USDC BALANCE</div>
          <div className="metric-value accent">
            {result.balanceUnits.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="metric-sub">USDC</div>
        </div>
        <div className="metric">
          <div className="metric-label">IN CENTS (ZK INPUT)</div>
          <div className="metric-value" style={{ fontSize: 16 }}>
            {result.balanceCents.toString()}
          </div>
          <div className="metric-sub">private u64</div>
        </div>
        <div className="metric">
          <div className="metric-label">WALLET</div>
          <div className="metric-value" style={{ fontSize: 14 }}>
            {short}
          </div>
          <div className="metric-sub">testnet</div>
        </div>
      </div>

      <div className="stack-sm">
        <div className="info-row">
          <span className="info-key">Asset</span>
          <span className="info-val accent">
            {result.assetCode}:{result.issuer.slice(0, 8)}…
          </span>
        </div>
        <div className="info-row">
          <span className="info-key">Raw Horizon Balance</span>
          <span className="info-val">{result.balance}</span>
        </div>
        <div className="info-row">
          <span className="info-key">Privacy</span>
          <span className="info-val green">Balance stays in browser</span>
        </div>
      </div>
    </div>
  );
}
