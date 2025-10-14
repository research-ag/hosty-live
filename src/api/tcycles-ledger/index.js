import {Actor} from "@dfinity/agent";
import {idlFactory} from "./tcycles_ledger.did.js";
import {getAgent} from "../../hooks/useInternetIdentity.js";

/* CANISTER_ID is replaced by webpack based on node environment
 * Note: canister environment variable will be standardized as
 * process.env.CANISTER_ID_<CANISTER_NAME_UPPERCASE>
 * beginning in dfx 0.15.0
 */
export const tCyclesLedgerCanisterId = import.meta.env.VITE_TCYCLES_LEDGER_CANISTER_ID;

export async function getTCyclesLedgerActor() {
    if (!tCyclesLedgerCanisterId) throw new Error("VITE_TCYCLES_LEDGER_CANISTER_ID is not set");
    return Actor.createActor(idlFactory, {
        agent: getAgent(), canisterId: tCyclesLedgerCanisterId,
    });
}
