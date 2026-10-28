import {Actor} from "@icp-sdk/core/agent";
import {Principal} from "@icp-sdk/core/principal";
import {idlFactory} from "./status_proxy.did.js";
import {getAgent} from "../../hooks/useInternetIdentity.js";

export const statusProxyCanisterId = import.meta.env.VITE_STATUS_PROXY_CANISTER_ID;

export async function getStatusProxyActor() {
    if (!statusProxyCanisterId) throw new Error("VITE_STATUS_PROXY_CANISTER_ID canister id is not set");
    return Actor.createActor(idlFactory, {
        agent: getAgent(),
        canisterId: statusProxyCanisterId,
    });
}

/**
 * Drops the proxy's cached canister_status of a canister after its settings changed, so the
 * next read reloads it. The proxy accepts this from controllers only (the signed-in user).
 * Best effort.
 */
export async function invalidateStatusCache(canisterId) {
    try {
        const actor = await getStatusProxyActor();
        await actor.invalidateCache(Principal.fromText(canisterId));
    } catch (err) {
        console.warn("Cannot invalidate the status proxy cache:", err);
    }
}
