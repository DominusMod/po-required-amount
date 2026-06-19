"use client";

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-wordmark">
          <span className="wordmark-badge">ZK</span>
          <span className="wordmark-name">Sotisfy</span>
        </div>
        <div className="header-status">
          <span className="status-dot" />
          Stellar testnet
        </div>
      </div>
    </header>
  );
}
