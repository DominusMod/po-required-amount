"use client";

import { useState } from "react";
import { generateBalanceProof, verifyBalanceProofLocal, usdToCents } from "../../lib_zk/prover";
import { fetchStellarUSDCBalance } from "../../lib_stellar/horizon";

export default function TestProver() {
  const [status, setStatus] = useState("idle");
  const [log, setLog] = useState<string[]>([]);

  function addLog(msg: string) {
    setLog((prev) => [...prev, msg]);
  }

  async function runTest() {
    setStatus("running");
    setLog([]);
    try {
      addLog("Fetching real USDC balance from Stellar testnet...");
      const result = await fetchStellarUSDCBalance(
        "GACX55QQJ57MCIWNJ7K2UDPWW5RGVT4MEC2D3DW7IIWKPUVO7KL4DJOC"
      );
      addLog("Raw balance: " + result.balance);
      addLog("Balance in cents: " + result.balanceCents.toString());

      const threshold = usdToCents(10); // prove balance >= $10

      addLog("Generating proof for balance >= $10 threshold...");
      const proof = await generateBalanceProof({
        balance: result.balanceCents,
        threshold,
      });
      addLog("Proof generated. publicInputs: " + JSON.stringify(proof.publicInputs));

      addLog("Verifying proof locally...");
      const valid = await verifyBalanceProofLocal(proof);
      addLog("Verification result: " + valid);

      setStatus(valid ? "success" : "failed");
    } catch (err) {
      addLog("ERROR: " + (err instanceof Error ? err.message : String(err)));
      setStatus("error");
    }
  }

  return (
    <div style={{ padding: 40, fontFamily: "monospace" }}>
      <h1>Prover + Horizon Test Page</h1>
      <button onClick={runTest} style={{ padding: "8px 16px", fontSize: 16 }}>
        Run Test
      </button>
      <p>Status: {status}</p>
      <pre>{log.join("\n")}</pre>
    </div>
  );
}