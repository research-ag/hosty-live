import { assetStorageHash } from "../../constants/knownHashes.ts";

/**
 * Fetch public/assetstorage.wasm.gz, the module installed when a frontend canister is created
 * or reset. The file name is not fingerprinted, so the URL carries the expected hash: a new
 * release gets a new cache key, and copies cached under an older URL are never reused. The
 * bytes are checked against the same hash so a stale or wrong module is never installed.
 */
export async function fetchAssetStorageModule(): Promise<Uint8Array> {
  const response = await fetch(`/assetstorage.wasm.gz?v=${assetStorageHash}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
  }
  const wasm = new Uint8Array(await response.arrayBuffer());
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", wasm));
  const hash = Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
  if (hash !== assetStorageHash) {
    throw new Error(
      `The canister module the app downloaded doesn't match this version of hosty.live ` +
        `(expected ${assetStorageHash}, got ${hash}). Reload the page and try again.`,
    );
  }
  return wasm;
}
