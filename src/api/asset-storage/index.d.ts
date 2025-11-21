import type { ActorSubclass } from '@icp-sdk/core/agent'

import { _SERVICE } from './asset_storage.did'

export declare const getAssetStorageActor: (canisterId: string) => Promise<ActorSubclass<_SERVICE>>;

