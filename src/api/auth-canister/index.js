import {Actor} from "@icp-sdk/core/agent";
import {idlFactory} from "./auth_canister.did.js";
import {getAgent} from "../../hooks/useInternetIdentity.js";

export const authCanisterId = '2eapi-vqaaa-aaaao-a4p4q-cai';

export async function getAuthCanisterActor() {
    if (!authCanisterId) throw new Error("Auth canister ID is not set");
    return Actor.createActor(idlFactory, {
        agent: getAgent(), canisterId: authCanisterId,
    });
}

