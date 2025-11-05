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

export const hostyBotModuleHash =
  "a29f0846ddf65e8a720826a9511b55017c452088f85c57b5ed99ff8510c07272";

export const customAssetHash =
  "ac918fb867b432655422c7fec1b21f5c084a9bc008487c9ac8472e0b3a3c0327";

export const mapModuleHash = (hash: string) => {
  if (hash === hostyBotModuleHash) {
    return "hostybot-0.26.0";
  }

  if (hash === customAssetHash) {
    return "asset canister custom";
  }

  if (assetMap[hash]) {
    return `asset canister ${assetMap[hash].join(", ")}`;
  }

  if (walletMap[hash]) {
    return `wallet canister ${walletMap[hash].join(", ")}`;
  }

  return "";
};

export const isAssetCanister = (hash: string) =>
  ["asset", "hostybot"].some((keyword) =>
    mapModuleHash(hash).includes(keyword)
  );
