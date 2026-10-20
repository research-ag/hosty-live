/**
 * Access layer over the two assets canister implementations hosty frontend canisters run:
 *
 * - `certified`: hosty's build of dfinity/certified-assets (see canisters/certified-assets).
 *   Deploy access is an `authorize`/`deauthorize` list (controllers only can edit it);
 *   content is uploaded through the sync protocol (./sync.ts).
 * - `legacy`: the previous hosty fork of the dfinity/sdk asset canister. Deploy access is
 *   Prepare/Commit permissions; content is uploaded with `store` or batches. Canisters keep
 *   running it until they are reset or returned to the pool, which reinstalls them.
 *
 * Every operation here first detects the kind (cached per canister id) and then uses the
 * matching interface, so callers never have to know which module a canister runs.
 */
import { Actor, type ActorSubclass } from "@icp-sdk/core/agent";
import { Principal } from "@icp-sdk/core/principal";
import { AssetManager } from "@dfinity/assets";
import { getAgent } from "../../hooks/useInternetIdentity.js";
import { getAssetStorageActor } from "../asset-storage";
import { idlFactory } from "./certified_assets.did.js";
import type { _SERVICE as CertifiedAssetsService } from "./certified_assets.did";
import { syncAssets, type CertifiedAssetsSyncActor, type SyncFile } from "./sync";

export type AssetsCanisterKind = "certified" | "legacy";

export function getCertifiedAssetsActor(canisterId: string): ActorSubclass<CertifiedAssetsService> {
  return Actor.createActor<CertifiedAssetsService>(idlFactory, {
    agent: getAgent(),
    canisterId,
  });
}

const kindCache = new Map<string, AssetsCanisterKind>();

/** Forget a cached detection, e.g. after a reset reinstalls the canister. */
export function forgetAssetsKind(canisterId: string) {
  kindCache.delete(canisterId);
}

/**
 * Which assets canister runs on `canisterId`: certified-assets answers `version`,
 * the legacy asset canister answers `api_version`. Throws if it is neither.
 */
export async function detectAssetsKind(canisterId: string): Promise<AssetsCanisterKind> {
  const cached = kindCache.get(canisterId);
  if (cached) return cached;
  let kind: AssetsCanisterKind;
  try {
    await getCertifiedAssetsActor(canisterId).version();
    kind = "certified";
  } catch (certifiedErr) {
    try {
      await (await getAssetStorageActor(canisterId)).api_version();
      kind = "legacy";
    } catch {
      throw certifiedErr;
    }
  }
  kindCache.set(canisterId, kind);
  return kind;
}

/** Allow `principal` to upload to the canister (caller must be a controller). */
export async function grantDeployAccess(canisterId: string, principal: Principal): Promise<void> {
  const kind = await detectAssetsKind(canisterId);
  if (kind === "certified") {
    await getCertifiedAssetsActor(canisterId).authorize(principal);
    return;
  }
  const legacy = await getAssetStorageActor(canisterId);
  await legacy.grant_permission({ permission: { Prepare: null }, to_principal: principal });
  await legacy.grant_permission({ permission: { Commit: null }, to_principal: principal });
}

/** Remove `principal`'s upload access. */
export async function revokeDeployAccess(canisterId: string, principal: Principal): Promise<void> {
  const kind = await detectAssetsKind(canisterId);
  if (kind === "certified") {
    await getCertifiedAssetsActor(canisterId).deauthorize(principal);
    return;
  }
  const legacy = await getAssetStorageActor(canisterId);
  await Promise.all([
    legacy.revoke_permission({ permission: { Prepare: null }, of_principal: principal }),
    legacy.revoke_permission({ permission: { ManagePermissions: null }, of_principal: principal }),
    legacy.revoke_permission({ permission: { Commit: null }, of_principal: principal }),
  ]);
}

/**
 * Principals explicitly allowed to upload. On certified-assets canisters controllers are
 * always allowed but are not listed here.
 */
export async function listDeployers(canisterId: string): Promise<Principal[]> {
  const kind = await detectAssetsKind(canisterId);
  if (kind === "certified") {
    return getCertifiedAssetsActor(canisterId).list_authorized();
  }
  const legacy = await getAssetStorageActor(canisterId);
  return legacy.list_permitted({ permission: { Commit: null } });
}

/**
 * Upload or replace single files, keeping everything else on the canister.
 * On certified-assets canisters this is a sync of (current assets + files).
 */
export async function putFiles(canisterId: string, files: SyncFile[]): Promise<void> {
  const kind = await detectAssetsKind(canisterId);
  if (kind === "certified") {
    const actor = getCertifiedAssetsActor(canisterId) as unknown as CertifiedAssetsSyncActor;
    await syncAssets(actor, files, { keepExisting: true, concurrency: 4 });
    return;
  }
  const assetManager = new AssetManager({
    canisterId: Principal.fromText(canisterId),
    agent: getAgent(),
  });
  for (const file of files) {
    await assetManager.store(file.content, {
      fileName: file.path.replace(/^\//, ""),
      contentType: file.contentType,
      contentEncoding: "identity",
    });
  }
}

/** Replace the whole site on a freshly installed certified-assets canister. */
export async function replaceSite(canisterId: string, files: SyncFile[]): Promise<void> {
  const actor = getCertifiedAssetsActor(canisterId) as unknown as CertifiedAssetsSyncActor;
  await syncAssets(actor, files, { concurrency: 4 });
}

/**
 * Republish the canister environment's `PUBLIC_*` variables in the `ic_env` cookie
 * (certified-assets only; the caller must be a controller or an authorized uploader).
 */
export async function refreshEnv(canisterId: string): Promise<void> {
  await getCertifiedAssetsActor(canisterId).refresh_env();
}

/**
 * The `PUBLIC_*` variables a certified-assets canister currently serves in the `ic_env`
 * cookie of its HTML at `/` (read with an `http_request` query, since browsers hide
 * `Set-Cookie` from fetch). Null when `/` sets no cookie.
 */
export async function readPublishedEnv(canisterId: string): Promise<Record<string, string> | null> {
  const response = await getCertifiedAssetsActor(canisterId).http_request({
    url: "/",
    method: "GET",
    body: [],
    headers: [["Accept", "text/html"]],
    certificate_version: [2],
  });
  const cookie = response.headers
    .filter(([name]) => name.toLowerCase() === "set-cookie")
    .map(([, value]) => value)
    .find((value) => value.startsWith("ic_env="));
  if (!cookie) return null;
  const payload = decodeURIComponent(cookie.slice("ic_env=".length).split(";")[0]);
  const published: Record<string, string> = {};
  for (const entry of payload.split("&")) {
    const eq = entry.indexOf("=");
    if (eq <= 0) continue;
    const name = entry.slice(0, eq);
    if (name !== "ic_root_key") published[name] = entry.slice(eq + 1);
  }
  return published;
}
