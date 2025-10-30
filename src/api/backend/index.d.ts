import type { ActorSubclass } from '@dfinity/agent'

import { _SERVICE } from './backend.did'

export declare const backendCanisterId: string;

export declare const getBackendActor: () => Promise<ActorSubclass<_SERVICE>>;
