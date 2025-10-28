import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface CanisterInfo {
  'userId' : Principal,
  'createdAt' : bigint,
  'updatedAt' : bigint,
  'frontendUrl' : string,
  'deletedAt' : [] | [bigint],
  'canisterId' : Principal,
}
export interface _SERVICE {
  'deleteCanister' : ActorMethod<[Principal], undefined>,
  'getCanister' : ActorMethod<[Principal], CanisterInfo>,
  'listCanisters' : ActorMethod<[], Array<CanisterInfo>>,
  'registerCanister' : ActorMethod<[Principal], CanisterInfo>,
  'updateTimestamp' : ActorMethod<[Principal], undefined>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];