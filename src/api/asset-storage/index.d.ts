import type { ActorSubclass } from '@dfinity/agent'

import { _SERVICE } from './asset_storage.did'

export declare const getAssetStorageActor: (canisterId: string) => Promise<ActorSubclass<_SERVICE>>;

