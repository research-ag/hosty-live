import { Principal } from "@icp-sdk/core/principal";
import { getAgent } from "../hooks/useInternetIdentity.ts";
import { useQuery } from "@tanstack/react-query";
import { Certificate, LookupPathStatus } from "@icp-sdk/core/agent";
import { decodeFirst, TagDecoder } from "cborg";
import { arrayBufferToHex } from "../utils/bufffer-utils.ts";

export const useCanisterStateStatus = (canisterId: string) => {
  const httpAgent = getAgent()
  return useQuery({
      queryKey: ["canister-state-status", canisterId],
      queryFn: async () => {
        const moduleHashPath: Uint8Array[] = [
          new TextEncoder().encode("canister"),
          Principal.fromText(canisterId).toUint8Array(),
          new TextEncoder().encode("module_hash"),
        ];

        const controllersPath: Uint8Array[] = [
          new TextEncoder().encode("canister"),
          Principal.fromText(canisterId).toUint8Array(),
          new TextEncoder().encode("controllers"),
        ];

        const res = await httpAgent.readState(canisterId.toString(), {
          paths: [moduleHashPath, controllersPath],
        });
        const cert = await Certificate.create({
          certificate: res.certificate,
          rootKey: await httpAgent.fetchRootKey(),
          canisterId: Principal.fromText(canisterId),
        });

        const data: { moduleHash: string | null; controllers: Array<string> | null } = {
          moduleHash: null,
          controllers: null,
        };

        const moduleHash = cert.lookup_path(moduleHashPath);
        if (moduleHash.status === LookupPathStatus.Found) {
          data.moduleHash = arrayBufferToHex(new Uint8Array(moduleHash.value as ArrayBuffer));
        } else if (moduleHash.status !== LookupPathStatus.Absent) {
          throw new Error(`module_hash LookupStatus: ${moduleHash.status}`);
        }

        const controllers = cert.lookup_path(controllersPath);
        if (controllers.status === LookupPathStatus.Found) {
          const tags: TagDecoder[] = [];
          tags[55799] = (val: any) => val;

          const [decoded]: [Uint8Array[], Uint8Array] = decodeFirst(
            new Uint8Array(controllers.value as ArrayBuffer),
            { tags }
          );
          data.controllers = decoded.map(x => Principal.fromUint8Array(x).toText());
        } else {
          throw new Error(`controllers LookupStatus: ${moduleHash.status}`);
        }

        return data;
      },
      enabled: !!canisterId,
      staleTime: 60 * 1000,
      refetchOnWindowFocus: true,
      retry: 2,
    }
  );
};