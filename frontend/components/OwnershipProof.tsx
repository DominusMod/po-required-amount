"use client";
import { useState } from "react";
import {
  isConnected,
  getAddress,
  requestAccess,
  signTransaction,
  getNetworkDetails,
} from "@stellar/freighter-api";
import {
  Networks,
  TransactionBuilder,
  BASE_FEE,
  Account,
  Operation,
  Asset,
} from "@stellar/stellar-sdk";

interface OwnershipProofProps {
  /** The public key whose balance was fetched — we verify Freighter owns it */
  expectedPublicKey: string;
  thresholdUSD: number;
  onSigned: (signerAddress: string, signFn: (xdr: string) => Promise<string>) => void;
  onError: (msg: string) => void;
}

type SignState = "idle" | "checking" | "signing" | "done" | "error";

export default function OwnershipProof({
  expectedPublicKey,
  thresholdUSD,
  onSigned,
  onError,
}: OwnershipProofProps) {
  const [state, setState] = useState<SignState>("idle");
  const [detail, setDetail] = useState("");

  async function handleSign() {
    setState("checking");
    setDetail("");

    try {
      // 1. Confirm Freighter is installed and connected
      const connectedRes = await isConnected();
      if (connectedRes.error) throw new Error(`Freighter error: ${connectedRes.error.message}`);
      if (!connectedRes.isConnected) {
        throw new Error("Freighter is not connected. Open the extension and unlock your wallet.");
      }

      // 2. Get the active address (or request access if not yet granted)
      let addressRes = await getAddress();
      if (addressRes.error || !addressRes.address) {
        const accessRes = await requestAccess();
        if (accessRes.error) throw new Error(`Access denied: ${accessRes.error.message}`);
        addressRes = { address: accessRes.address };
      }

      const signerAddress = addressRes.address;

      // 3. Verify it matches the wallet whose balance was fetched
      if (signerAddress !== expectedPublicKey) {
        throw new Error(
          `Freighter address (${signerAddress.slice(0, 8)}…) does not match the wallet you entered (${expectedPublicKey.slice(0, 8)}…). Switch accounts in Freighter and try again.`
        );
      }

      // 4. Confirm we're on testnet
      const networkRes = await getNetworkDetails();
      if (networkRes.error) throw new Error(`Network check failed: ${networkRes.error.message}`);
      if (!networkRes.networkPassphrase.includes("Test")) {
        throw new Error(
          `Freighter is on ${networkRes.network}. Switch to Testnet in Freighter settings.`
        );
      }

      setState("signing");
      setDetail("Waiting for Freighter approval…");

      // 5. Build a minimal no-op transaction for the wallet to sign
      //    This proves ownership without submitting anything on-chain.
      //    We use a self-payment of 0 XLM — valid structure, never submitted.
      const account = new Account(signerAddress, "0");
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: signerAddress,
            asset: Asset.native(),
            amount: "0.0000001",
          })
        )
        .setTimeout(30)
        .build();

      const txXDR = tx.toXDR();

      // 6. Sign with Freighter — user sees the popup here
      const signRes = await signTransaction(txXDR, {
        networkPassphrase: Networks.TESTNET,
        address: signerAddress,
      });

      if (signRes.error) throw new Error(`Signing failed: ${signRes.error.message}`);

      setState("done");
      setDetail(`Signed · ${signerAddress.slice(0, 8)}…${signerAddress.slice(-4)}`);

      // 7. Build the real sign function to pass into verifyProofOnChain later
      const signFn = async (xdrEnvelope: string): Promise<string> => {
        const res = await signTransaction(xdrEnvelope, {
          networkPassphrase: Networks.TESTNET,
          address: signerAddress,
        });
        if (res.error) throw new Error(`Freighter signing failed: ${res.error.message}`);
        return res.signedTxXdr;
      };

      onSigned(signerAddress, signFn);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setState("error");
      setDetail(msg);
      onError(msg);
    }
  }

  const iconEl =
    state === "done" ? <Check /> :
    state === "error" ? <XIcon /> :
    state === "checking" || state === "signing" ? <Spin /> :
    <ShieldIcon />;

  const iconClass =
    state === "done" ? "done" :
    state === "error" ? "error" :
    state === "checking" || state === "signing" ? "working" :
    "idle";

  const btnLabel =
    state === "checking" ? "Checking Freighter…" :
    state === "signing"  ? "Waiting for signature…" :
    state === "done"     ? "Wallet verified ✓" :
    state === "error"    ? "Retry" :
    "Sign with Freighter";

  const btnDisabled = state === "checking" || state === "signing" || state === "done";

  return (
    <div className="card stack-md">
      <div className="step-indicator">
        <div className="step-num">3</div>
        <div className="step-title">Prove wallet ownership</div>
      </div>

      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: -8 }}>
        Sign a message with Freighter to confirm you control this wallet.
        Nothing is submitted on-chain — this is ownership verification only.
      </p>

      {/* Threshold reminder */}
      <div className="callout info" style={{ marginTop: -4 }}>
        <span style={{ fontSize: 14 }}>🔒</span>
        <span>
          Proving balance ≥{" "}
          <strong>
            ${thresholdUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC
          </strong>{" "}
          for{" "}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
            {expectedPublicKey.slice(0, 8)}…{expectedPublicKey.slice(-6)}
          </span>
        </span>
      </div>

      {/* Pipeline-style status row */}
      <div className="pipeline">
        <div className="pipeline-step">
          <div className={`pipeline-icon ${iconClass}`}>{iconEl}</div>
          <div className="pipeline-body">
            <div className="pipeline-title">
              {state === "idle"     && "Ready to sign"}
              {state === "checking" && "Checking Freighter extension"}
              {state === "signing"  && "Approve in Freighter popup"}
              {state === "done"     && "Wallet ownership confirmed"}
              {state === "error"    && "Signing failed"}
            </div>
            <div className="pipeline-desc">
              {state === "idle"     && "Click the button below — Freighter will open a signing popup"}
              {state === "checking" && "Verifying connection and network…"}
              {state === "signing"  && "Waiting for you to approve in Freighter"}
              {state === "done"     && "Proof pipeline will start automatically"}
              {state === "error"    && "See error detail below"}
            </div>
            {detail && (
              <div
                className="pipeline-detail"
                style={{ color: state === "error" ? "var(--red)" : undefined }}
              >
                {detail}
              </div>
            )}
          </div>
          <span
            className={`badge ${
              state === "done"
                ? "badge-success"
                : state === "error"
                ? "badge-error"
                : state === "checking" || state === "signing"
                ? "badge-working"
                : "badge-idle"
            }`}
            style={{ flexShrink: 0 }}
          >
            <span className="badge-dot" />
            {state === "idle" ? "pending" : state === "checking" ? "checking" : state === "signing" ? "signing" : state === "done" ? "verified" : "failed"}
          </span>
        </div>
      </div>

      <button
        className="btn btn-primary btn-full"
        onClick={handleSign}
        disabled={btnDisabled}
      >
        {(state === "checking" || state === "signing") && <Spin />}
        {btnLabel}
      </button>
    </div>
  );
}

function Check() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2.5 6.5l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M3 3l7 7M10 3l-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function Spin() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="8" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5L2 3.5v4c0 2.8 2.1 4.8 5 5.5 2.9-.7 5-2.7 5-5.5v-4L7 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
