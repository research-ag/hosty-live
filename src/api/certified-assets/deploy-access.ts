import { Principal } from "@icp-sdk/core/principal";
import { getManagementActor } from "../management";
import { isAssetCanister } from "../../constants/knownHashes.ts";
import { arrayBufferToHex } from "../../utils/bufffer-utils.ts";
import { grantDeployAccess } from "./index.ts";

/** Headroom above the freezing limit a canister needs to take an upload (as the API checks). */
const CYCLES_MARGIN = 50_000_000_000n;

export type DeployAccessOutcome =
  | { status: "granted" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

/**
 * Plain-language reason for an IC reject, so a failed grant does not read as a permission
 * problem when the canister is frozen or empty.
 */
export function explainIcError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/IC0207|out of cycles/i.test(message)) {
    return "Out of cycles: the IC rejects calls to it. Top it up on its page, then try again.";
  }
  if (/IC0537|no wasm module|contains no wasm/i.test(message)) {
    return "Empty canister: no module installed. Open its page and click “Install asset module”.";
  }
  if (/IC0512|only the controllers|not a controller|is not authorized|unauthori[sz]ed/i.test(message)) {
    return "You are not a controller of this canister.";
  }
  const firstLine = message.split("\n").find((line) => line.trim()) ?? message;
  return firstLine.length > 200 ? `${firstLine.slice(0, 200)}…` : firstLine;
}

/**
 * Checks a canister with `canister_status` (as the user, so it answers for frozen and empty
 * canisters too) and grants `uploader` deploy access when it can take one: empty, non-asset
 * and backend canisters are skipped with the reason, frozen ones fail with the fix.
 */
export async function grantDeployAccessChecked(
  canisterId: string,
  uploader: Principal,
  kind: "frontend" | "backend",
): Promise<DeployAccessOutcome> {
  if (kind === "backend") {
    return {
      status: "skipped",
      reason: "Backend canister: agents install modules with a deploy session, no upload access needed.",
    };
  }
  const target = Principal.fromText(canisterId);
  let status;
  try {
    const management = await getManagementActor();
    status = await management.canister_status.withOptions({ effectiveCanisterId: target })({
      canister_id: target,
    });
  } catch (err) {
    return { status: "failed", reason: explainIcError(err) };
  }

  if (status.module_hash.length === 0) {
    return {
      status: "skipped",
      reason: "Empty canister: no module installed. Open its page and click “Install asset module”.",
    };
  }
  const moduleHash = arrayBufferToHex(status.module_hash[0] as Uint8Array);
  if (!isAssetCanister(moduleHash)) {
    return {
      status: "skipped",
      reason:
        "Runs a module that is not an asset canister. “Reset canister” on its page installs hosty’s asset module (wipes it).",
    };
  }
  // the generated typings are loose about nat; normalise to bigint. Reserved cycles count
  // towards the freezing limit, so only the rest must come from the balance.
  const freezingLimit =
    (BigInt(status.idle_cycles_burned_per_day) * BigInt(status.settings.freezing_threshold)) / 86_400n;
  const reserved = BigInt(status.reserved_cycles);
  const required = (freezingLimit > reserved ? freezingLimit - reserved : 0n) + CYCLES_MARGIN;
  if (BigInt(status.cycles) < required) {
    return {
      status: "failed",
      reason: "Out of cycles: the IC rejects calls to it. Top it up on its page, then try again.",
    };
  }

  try {
    await grantDeployAccess(canisterId, uploader);
    return { status: "granted" };
  } catch (err) {
    return { status: "failed", reason: explainIcError(err) };
  }
}
