import type { ActorSubclass } from '@dfinity/agent'

import { _SERVICE } from './tcycles_ledger.did'

export declare const tCyclesLedgerCanisterId: string;

export declare const getTCyclesLedgerActor: () => Promise<ActorSubclass<_SERVICE>>;
