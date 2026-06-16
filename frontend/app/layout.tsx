import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "po-required-amount · ZK Proof of Balance",
  description:
    "Prove your Stellar wallet holds ≥ X USDC without revealing your exact balance. Built with Noir ZK circuits + Soroban on Stellar testnet.",
  openGraph: {
    title: "po-required-amount",
    description: "ZK Proof-of-Balance for Stellar — Real-World ZK Hackathon",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="layout">{children}</body>
    </html>
  );
}
