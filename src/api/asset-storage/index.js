import {Actor} from "@dfinity/agent";
import {idlFactory} from "./asset_storage.did.js";
import {getAgent} from "../../hooks/useInternetIdentity.js";

export async function getAssetStorageActor(canisterId) {
    return Actor.createActor(idlFactory, {
        agent: getAgent(), canisterId,
    });
}

