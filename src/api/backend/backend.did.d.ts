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
export interface ProfileInfo {
  'username' : [] | [string],
  'userId' : Principal,
  'createdAt' : bigint,
  'updatedAt' : bigint,
  'freeCanisterClaimedAt' : [] | [bigint],
}
export type Result = { 'ok' : CanisterInfo } |
  { 'err' : string };
export interface _SERVICE {
  'claimFreeCanister' : ActorMethod<[], Result>,
  'deleteCanister' : ActorMethod<[Principal], undefined>,
  'getCanister' : ActorMethod<[Principal], CanisterInfo>,
  'getProfile' : ActorMethod<[], [] | [ProfileInfo]>,
  'listCanisters' : ActorMethod<[], Array<CanisterInfo>>,
  'onCanisterDeployed' : ActorMethod<[Principal], undefined>,
  'registerCanister' : ActorMethod<[Principal], CanisterInfo>,
  'updateProfile' : ActorMethod<[{ 'username' : [] | [string] }], ProfileInfo>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];