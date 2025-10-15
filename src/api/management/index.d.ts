import type { ActorSubclass } from '@dfinity/agent'

import { _SERVICE } from './management.did'

export declare const getManagementActor: () => Promise<ActorSubclass<_SERVICE>>;
