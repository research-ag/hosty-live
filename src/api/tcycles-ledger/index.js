import {Actor} from "@icp-sdk/core/agent";
import {idlFactory} from "./tcycles_ledger.did.js";
import {getAgent} from "../../hooks/useInternetIdentity.js";

export const tCyclesLedgerCanisterId = import.meta.env.VITE_TCYCLES_LEDGER_CANISTER_ID;

export async function getTCyclesLedgerActor() {
    if (!tCyclesLedgerCanisterId) throw new Error("VITE_TCYCLES_LEDGER_CANISTER_ID is not set");
    return Actor.createActor(idlFactory, {
        agent: getAgent(), canisterId: tCyclesLedgerCanisterId,
    });
}
