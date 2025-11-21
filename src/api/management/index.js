import {Actor} from "@icp-sdk/core/agent";
import {idlFactory} from "./management.did.js";
import {getAgent} from "../../hooks/useInternetIdentity.js";

export async function getManagementActor() {
    return Actor.createActor(idlFactory, {
        agent: getAgent(), canisterId: "aaaaa-aa",
    });
}
