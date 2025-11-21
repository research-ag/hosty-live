import type { ActorSubclass } from '@icp-sdk/core/agent'

import { _SERVICE } from './management.did'

export declare const getManagementActor: () => Promise<ActorSubclass<_SERVICE>>;
