import { sdkModuleHashes } from "./sdkModuleHashes.ts";

const assetMap = sdkModuleHashes.reduce<Record<string, string[]>>(
  (acc, item) => ({
    ...acc,
    [item.assetModuleHash]: acc[item.assetModuleHash]
      ? acc[item.assetModuleHash].includes(`v${item.version}`)
        ? acc[item.assetModuleHash]
        : [...acc[item.assetModuleHash], `v${item.version}`]
      : [`v${item.version}`],
  }),
  {}
);

const walletMap = sdkModuleHashes.reduce<Record<string, string[]>>(
  (acc, item) => ({
    ...acc,
    [item.walletModuleHash]: acc[item.walletModuleHash]
      ? acc[item.walletModuleHash].includes(`v${item.version}`)
        ? acc[item.walletModuleHash]
        : [...acc[item.walletModuleHash], `v${item.version}`]
      : [`v${item.version}`],
  }),
  {}
);

// Current hosty frontend canister: hosty build of dfinity/certified-assets v0.4.1 with the
// cycles patch (canisters/certified-assets), second release ("Cycles requested" wording when a
// cycles call was not performed). This is the sha256 of public/assetstorage.wasm.gz and must
// match it: the app fetches the file as ?v=<this hash> and refuses to install other bytes
// (src/api/certified-assets/module.ts).
export const assetStorageHash = "c0be4fae735b163c80eb21226cbe0fef9ec912ff97687f2bec6634c5b5ab5068";
// uncompressed sha256 of the same module. Happens when we reset canister from local development environment
export const assetStorageUncompressedHash = "55836953485d24e05eb0377a6a55bc2d0615bf980f89b6fd3601235e78691390";
// First release of the same build (2026-10-13); still runs on canisters not reset since.
export const previousAssetStorageHash = "c42f7801f11c8695d74b3d7f7b58ac3138fbb55292d3273b46bd7d021b94bae8";
export const previousAssetStorageUncompressedHash = "adf4cbcca2133d74a1bcd6e644779af2025db0e5a7b9e47eba0e31d219b21c40";
// Previous hosty module: patched dfinity/sdk asset canister ("hostybot"). Still runs on
// canisters that were not reset since the switch; the web app talks to both (src/api/certified-assets).
export const legacyAssetStorageHash = "aca05c51145c77094d393637e700ca31a33682c478af41132dfb0bfe0ddcd3f0";
export const legacyAssetStorageUncompressedHash = "c8055ab49ce2367edcc26ec57f421501e2a3cccf1458c2140ad3b6fc65096391";

export const mapModuleHash = (hash: string) => {
    if (hash == assetStorageHash) {
      return "hosty-ca-0.4.1-r2";
    } else if (hash == assetStorageUncompressedHash) {
      return "hosty-ca-0.4.1-r2-uncompressed";
    } else if (hash == previousAssetStorageHash) {
      return "hosty-ca-0.4.1";
    } else if (hash == previousAssetStorageUncompressedHash) {
      return "hosty-ca-0.4.1-uncompressed";
    } else if (hash == legacyAssetStorageHash) {
      return "hostybot-tc-0.30.1";
    } else if (hash == legacyAssetStorageUncompressedHash) {
      return "hostybot-tc-0.30.1-uncompressed";
    } else if (hash === "a29f0846ddf65e8a720826a9511b55017c452088f85c57b5ed99ff8510c07272") {
      return "hostybot-0.26.0";
    }

    if (hash === "ac918fb867b432655422c7fec1b21f5c084a9bc008487c9ac8472e0b3a3c0327") {
      return "asset canister custom";
    }

    if (assetMap[hash]) {
      return `asset canister ${assetMap[hash].join(", ")}`;
    }

    if (walletMap[hash]) {
      return `wallet canister ${walletMap[hash].join(", ")}`;
    }

    return "";
  }
;

export const isAssetCanister = (hash: string) =>
  ["asset", "hosty"].some((keyword) =>
    mapModuleHash(hash).includes(keyword)
  );

// both hosty modules expose the controller-only wallet_send / tcycles_deposit methods
export const supportsCyclesWithdrawal = (hash: string) => /hostybot|hosty-ca/.test(mapModuleHash(hash));

export const supportsTcyclesWithdrawal = (hash: string) => /hostybot-tc|hosty-ca/.test(mapModuleHash(hash));
