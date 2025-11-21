import type { ActorSubclass } from '@icp-sdk/core/agent'

import { _SERVICE } from './status_proxy.did'

export declare const statusProxyCanisterId: string;

export declare const getStatusProxyActor: () => Promise<ActorSubclass<_SERVICE>>;
