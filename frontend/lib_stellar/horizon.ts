
/**
 * lib_stellar/horizon.ts
 * Fetch USDC balance from Stellar Horizon (testnet)
 *
 * Testnet USDC issuer confirmed against live Horizon response on 2026-06-18:
 * GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
 */

export const HORIZON_TESTNET = "https://horizon-testnet.stellar.org";

// Testnet USDC issuer (Circle's testnet USDC)
export const USDC_ISSUER_TESTNET = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
export const USDC_ASSET_CODE = "USDC";

export interface BalanceResult {
  balance: string;           // raw string from Horizon e.g. "1250.0000000"
  balanceCents: bigint;      // balance in cents (integer, 2 dp) for ZK circuit
  balanceUnits: number;      // human-readable float
  assetCode: string;
  issuer: string;
}

export interface HorizonBalance {
  balance: string;
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  buying_liabilities?: string;
  selling_liabilities?: string;
}

/**
 * Converts a Stellar balance string (7 decimal places, e.g. "1250.0000000")
 * into an exact integer number of cents (2 decimal places), as a bigint.
 *
 * Done via string manipulation rather than parseFloat()/Math.round() to avoid
 * floating point rounding errors (e.g. 0.1 * 100 !== 10 exactly in JS floats).
 */
export function stellarBalanceStringToCents(balanceStr: string): bigint {
  const [wholePart, fracPart = ""] = balanceStr.split(".");
  // Stellar uses 7 decimal places; we only need the first 2 (cents).
  // Truncate (not round) to match how on-chain balances are conventionally
  // floored when converting to a coarser unit — avoids ever overstating
  // the proven balance.
  const centsFromFrac = fracPart.slice(0, 2).padEnd(2, "0");
  const wholeCents = BigInt(wholePart) * 100n;
  const fracCents = BigInt(centsFromFrac || "0");
  return wholeCents + fracCents;
}

export async function fetchStellarUSDCBalance(
  publicKey: string
): Promise<BalanceResult> {
  if (!isValidStellarPublicKey(publicKey)) {
    throw new Error("Invalid Stellar public key format. Expected a G... address.");
  }

  const url = `${HORIZON_TESTNET}/accounts/${publicKey}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (res.status === 404) {
    throw new Error(
      "Account not found on Stellar testnet. Fund it at https://friendbot.stellar.org"
    );
  }
  if (!res.ok) {
    throw new Error(`Horizon error ${res.status}: ${res.statusText}`);
  }

  const account = await res.json();
  const balances: HorizonBalance[] = account.balances ?? [];

  const usdcBalance = balances.find(
    (b) =>
      b.asset_code === USDC_ASSET_CODE &&
      b.asset_issuer === USDC_ISSUER_TESTNET
  );

  if (!usdcBalance) {
    return {
      balance: "0.0000000",
      balanceCents: 0n,
      balanceUnits: 0,
      assetCode: USDC_ASSET_CODE,
      issuer: USDC_ISSUER_TESTNET,
    };
  }

  const balanceCents = stellarBalanceStringToCents(usdcBalance.balance);

  return {
    balance: usdcBalance.balance,
    balanceCents,
    balanceUnits: parseFloat(usdcBalance.balance),
    assetCode: USDC_ASSET_CODE,
    issuer: USDC_ISSUER_TESTNET,
  };
}

/** Fund an account via Friendbot (testnet only) */
export async function fundTestnetAccount(publicKey: string): Promise<boolean> {
  const url = `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`;
  const res = await fetch(url);
  return res.ok;
}

/** Validate a Stellar public key (G-address) */
export function isValidStellarPublicKey(key: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(key);
}