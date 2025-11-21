import type { ActorSubclass } from '@icp-sdk/core/agent'

import { _SERVICE } from './auth_canister.did'

export declare const authCanisterId: string;

export declare const getAuthCanisterActor: () => Promise<ActorSubclass<_SERVICE>>;

