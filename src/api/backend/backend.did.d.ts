import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface CanisterInfo {
  'alias' : [] | [string],
  'deployedAt' : [] | [bigint],
  'createdAt' : bigint,
  'description' : [] | [string],
  'userIds' : Array<Principal>,
  'frontendUrl' : string,
  'deletedAt' : [] | [bigint],
  'canisterId' : Principal,
  'ownedBySystem' : boolean,
}
export interface ProfileInfo {
  'username' : [] | [string],
  'userId' : Principal,
  'createdAt' : bigint,
  'updatedAt' : bigint,
  'rentedCanister' : [] | [[CanisterInfo, bigint]],
}
export type Result = { 'ok' : CanisterInfo } |
  { 'err' : string };
export type Result_1 = { 'ok' : null } |
  { 'err' : string };
export interface _SERVICE {
  'canRentCanister' : ActorMethod<[], boolean>,
  'deleteCanister' : ActorMethod<[Principal], undefined>,
  'donateCanister' : ActorMethod<[Principal], Result_1>,
  'getCanister' : ActorMethod<[Principal], CanisterInfo>,
  'getProfile' : ActorMethod<[], [] | [ProfileInfo]>,
  'listCanisters' : ActorMethod<[], Array<CanisterInfo>>,
  'onCanisterDeployed' : ActorMethod<[Principal], undefined>,
  'registerCanister' : ActorMethod<[Principal], CanisterInfo>,
  'rentCanister' : ActorMethod<[], Result>,
  'updateCanister' : ActorMethod<
    [
      Principal,
      {
        'alias' : [] | [[] | [string]],
        'description' : [] | [[] | [string]],
        'frontendUrl' : [] | [string],
      },
    ],
    CanisterInfo
  >,
  'updateProfile' : ActorMethod<[{ 'username' : [] | [string] }], ProfileInfo>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];