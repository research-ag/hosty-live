import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Backend {
  'addDeploymentExample' : ActorMethod<[DeploymentExampleInput], undefined>,
  'canRentCanister' : ActorMethod<[], boolean>,
  'deleteCanister' : ActorMethod<[Principal], undefined>,
  'donateCanister' : ActorMethod<[Principal], Result_1>,
  'getCanister' : ActorMethod<[Principal], CanisterInfo>,
  'getProfile' : ActorMethod<[], [] | [ProfileInfo]>,
  'http_request' : ActorMethod<[Request], Response>,
  'listCanisters' : ActorMethod<[], Array<CanisterInfo>>,
  'listDeploymentExamples' : ActorMethod<[], Array<DeploymentExample>>,
  'listUserCanisters' : ActorMethod<
    [Principal],
    { 'rented' : [] | [[CanisterInfo, bigint]], 'owned' : Array<CanisterInfo> }
  >,
  'onCanisterDeployed' : ActorMethod<[Principal], undefined>,
  'registerCanister' : ActorMethod<[Principal], CanisterInfo>,
  'rentCanister' : ActorMethod<[], Result>,
  'rentCanisterFor' : ActorMethod<[Principal], Result>,
  'restartScheduler' : ActorMethod<[], undefined>,
  'setAssetsModule' : ActorMethod<
    [Uint8Array | number[], Uint8Array | number[]],
    undefined
  >,
  'setMaxRentals' : ActorMethod<[bigint], undefined>,
  'undoDonation' : ActorMethod<[Principal, Principal], undefined>,
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
export interface DeploymentExample {
  'url' : string,
  'owner' : [] | [Principal],
  'kind' : { 'git' : string } |
    { 'archive' : null },
  'assets' : { 'pure' : null } |
    { 'build' : { 'command' : string, 'envVars' : string } },
  'description' : string,
  'assetsDir' : string,
}
export interface DeploymentExampleInput {
  'url' : string,
  'kind' : { 'git' : string } |
    { 'archive' : null },
  'assets' : { 'pure' : null } |
    { 'build' : { 'command' : string, 'envVars' : string } },
  'description' : string,
  'assetsDir' : string,
}
export interface ProfileInfo {
  'username' : [] | [string],
  'userId' : Principal,
  'createdAt' : bigint,
  'updatedAt' : bigint,
  'rentedCanister' : [] | [[CanisterInfo, bigint]],
}
export interface Request {
  'url' : string,
  'method' : string,
  'body' : Uint8Array | number[],
  'headers' : Array<[string, string]>,
}
export interface Response {
  'body' : Uint8Array | number[],
  'headers' : Array<[string, string]>,
  'status_code' : number,
}
export type Result = { 'ok' : CanisterInfo } |
  { 'err' : string };
export type Result_1 = { 'ok' : null } |
  { 'err' : string };
export interface _SERVICE extends Backend {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
