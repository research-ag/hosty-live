import { Principal } from "@icp-sdk/core/principal";
import { getAssetStorageActor } from "../api/asset-storage";
import { getStoredPrincipal } from "../services/api";
import { parseTCToRaw } from "../utils/cycles.ts";

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
  const res = await actor.wallet_send({ canister: Principal.fromText(dest), amount });
  if ("Err" in res) {
    const err = (res as any).Err;
    throw new Error(
      typeof err === "string"
        ? err
        : err?.GenericError?.message || "Failed to withdraw cycles"
    );
  }
}

export async function depositTCyclesToSelf(
  sourceCanisterId: string,
  amountTC: string | number,
  opts?: { subaccount?: Uint8Array | number[] }
): Promise<void> {
  const src = Principal.fromText(sourceCanisterId).toText();
  const actor = await getAssetStorageActor(src);
  const ownerText = getStoredPrincipal();
  if (!ownerText) {
    throw new Error("Not authenticated. Please sign in to deposit to your account.");
  }
  const owner = Principal.fromText(ownerText);
  const amount = parseTCToRaw(amountTC);
  await actor.tcycles_deposit({
    deposit_args: {
      to: { owner, subaccount: opts?.subaccount ? [opts.subaccount] : [] },
      memo: []
    }, amount
  });
}
