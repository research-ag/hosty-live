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

export const assetStorageHash = "aca05c51145c77094d393637e700ca31a33682c478af41132dfb0bfe0ddcd3f0";
// uncompressed assetstorage.wasm sha256 sum. Happens when we reset canister from local development environment
export const assetStorageUncompressedHash = "c8055ab49ce2367edcc26ec57f421501e2a3cccf1458c2140ad3b6fc65096391";

export const mapModuleHash = (hash: string) => {
    if (hash == assetStorageHash) {
      return "hostybot-tc-0.30.1";
    } else if (hash == assetStorageUncompressedHash) {
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
  ["asset", "hostybot"].some((keyword) =>
    mapModuleHash(hash).includes(keyword)
  );

export const supportsCyclesWithdrawal = (hash: string) => mapModuleHash(hash).includes("hostybot");

export const supportsTcyclesWithdrawal = (hash: string) => mapModuleHash(hash).includes("hostybot-tc");
