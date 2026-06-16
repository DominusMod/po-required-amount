"use client";

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-wordmark">
          <span className="wordmark-badge">ZK</span>
          <span className="wordmark-name">po-required-amount</span>
        </div>
        <span className="header-tag">Stellar testnet · Real-World ZK Hackathon</span>
      </div>
    </header>
  );
}
