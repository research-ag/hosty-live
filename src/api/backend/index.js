import {Actor} from "@icp-sdk/core/agent";
import {idlFactory} from "./backend.did.js";
import {getAgent} from "../../hooks/useInternetIdentity.js";

/* CANISTER_ID is replaced by webpack based on node environment
 * Note: canister environment variable will be standardized as
 * process.env.CANISTER_ID_<CANISTER_NAME_UPPERCASE>
 * beginning in dfx 0.15.0
 */
export const backendCanisterId = import.meta.env.VITE_BACKEND_CANISTER_ID;

export async function getBackendActor() {
    if (!backendCanisterId) throw new Error("VITE_BACKEND_CANISTER_ID canister id is not set");
    return Actor.createActor(idlFactory, {
        agent: getAgent(),
        canisterId: backendCanisterId,
    });
}
