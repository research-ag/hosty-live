import type { ActorSubclass } from '@icp-sdk/core/agent'

import { _SERVICE } from './tcycles_ledger.did'

export declare const tCyclesLedgerCanisterId: string;

export declare const getTCyclesLedgerActor: () => Promise<ActorSubclass<_SERVICE>>;
