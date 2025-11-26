import { Principal } from "@icp-sdk/core/principal";
import { getAssetStorageActor } from "../api/asset-storage";

function parseTCToRaw(tc: string | number): bigint {
  const DECIMALS = 12n;
  const parts = tc.toString().trim();
  if (!/^\d*(?:\.\d{0,12})?$/.test(parts)) {
    throw new Error("Invalid amount format. Use up to 12 decimal places.");
  }
  const [wholeStr, fracStr = ""] = parts.split(".");
  const whole = BigInt(wholeStr || "0");
  const fracPadded = (fracStr + "0".repeat(12)).slice(0, 12);
  const frac = BigInt(fracPadded);
  return whole * 10n ** DECIMALS + frac;
}

export function formatTCFromRaw(raw: string | number | bigint): string {
  const n = typeof raw === "bigint" ? raw : BigInt(raw.toString());
  const DECIMALS = 12n;
  const denom = 10n ** DECIMALS;
  const whole = n / denom;
  const frac = n % denom;
  const fracStr = (Number(frac) / Number(denom)).toFixed(4).split(".")[1];
  return `${whole.toString()}.${fracStr}`;
}

export async function withdrawCycles(
  sourceCanisterId: string,
  destinationCanisterId: string,
  amountTC: string | number
): Promise<void> {
  const src = Principal.fromText(sourceCanisterId).toText();
  const dest = Principal.fromText(destinationCanisterId).toText();
  if (src === dest) {
    throw new Error("Destination cannot be the same as the source canister.");
  }

  const actor = await getAssetStorageActor(src);
  const amount = parseTCToRaw(amountTC);
  const res = await actor.wallet_send128({
    canister: Principal.fromText(dest),
    amount,
  });
  if ("Err" in res) {
    const err = (res as any).Err;
    throw new Error(
      typeof err === "string"
        ? err
        : err?.GenericError?.message || "Failed to withdraw cycles"
    );
  }
}
