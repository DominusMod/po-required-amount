/**
 * lib_stellar/horizon.ts
 * Fetch USDC balance from Stellar Horizon (testnet)
 * USDC on Stellar testnet: GBBD47IF6LWK7P7MLAUZWD4JRMH3HMTJJLRPPVSCCQHQ6XXVKHHHFCA
 */

export const HORIZON_TESTNET = "https://horizon-testnet.stellar.org";

// Testnet USDC issuer (Circle's testnet USDC)
export const USDC_ISSUER_TESTNET = "GBBD47IF6LWK7P7MLAUZWD4JRMH3HMTJJLRPPVSCCQHQ6XXVKHHHFCA";
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

export async function fetchStellarUSDCBalance(
  publicKey: string
): Promise<BalanceResult> {
  const url = `${HORIZON_TESTNET}/accounts/${publicKey}`;
  
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (res.status === 404) {
    throw new Error("Account not found on Stellar testnet. Fund it at https://friendbot.stellar.org");
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

  // Stellar stores 7 decimal places. We convert to integer cents (2dp)
  // e.g. "1250.0000000" → 125000n
  const balanceFloat = parseFloat(usdcBalance.balance);
  const balanceCents = BigInt(Math.round(balanceFloat * 100));

  return {
    balance: usdcBalance.balance,
    balanceCents,
    balanceUnits: balanceFloat,
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
