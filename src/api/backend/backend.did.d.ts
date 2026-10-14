import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Backend {
  'addDeploymentExample' : ActorMethod<[DeploymentExampleInput], undefined>,
  'canRentCanister' : ActorMethod<[], boolean>,
  'clearWasmChunks' : ActorMethod<[Principal, Principal], undefined>,
  'deleteCanister' : ActorMethod<[Principal], undefined>,
  'donateCanister' : ActorMethod<[Principal], Result_1>,
  'getCanister' : ActorMethod<[Principal], CanisterInfo>,
  'getProfile' : ActorMethod<[], [] | [ProfileInfo]>,
  'http_request' : ActorMethod<[Request], Response>,
  'installCode' : ActorMethod<
    [
      Principal,
      Principal,
      CanisterInstallMode,
      Uint8Array | number[],
      Uint8Array | number[],
      Array<Uint8Array | number[]>,
    ],
    undefined
  >,
  'listCanisters' : ActorMethod<[], Array<CanisterInfo>>,
  'listDeploymentExamples' : ActorMethod<[], Array<DeploymentExample>>,
  'listUserCanisters' : ActorMethod<
    [Principal],
    { 'rented' : [] | [[CanisterInfo, bigint]], 'owned' : Array<CanisterInfo> }
  >,
  'onCanisterDeployed' : ActorMethod<[Principal], undefined>,
  'preparePoolCanisters' : ActorMethod<[], bigint>,
  'registerCanister' : ActorMethod<[Principal], CanisterInfo>,
  'rentCanister' : ActorMethod<[], Result>,
  'rentCanisterFor' : ActorMethod<[Principal], Result>,
  'restartScheduler' : ActorMethod<[], undefined>,
  'setAssetsModule' : ActorMethod<
    [Uint8Array | number[], Uint8Array | number[]],
    undefined
  >,
  'setCanisterKind' : ActorMethod<[Principal, CanisterKind], CanisterInfo>,
  'setCanisterKindFor' : ActorMethod<
    [Principal, Principal, CanisterKind],
    CanisterInfo
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
  'uploadWasmChunk' : ActorMethod<
    [Principal, Principal, Uint8Array | number[]],
    ChunkHash
  >,
}
export interface CanisterInfo {
  'alias' : [] | [string],
  'deployedAt' : [] | [bigint],
  'kind' : CanisterKind,
  'createdAt' : bigint,
  'description' : [] | [string],
  'userIds' : Array<Principal>,
  'frontendUrl' : string,
  'deletedAt' : [] | [bigint],
  'canisterId' : Principal,
  'ownedBySystem' : boolean,
}
export type CanisterInstallMode = { 'reinstall' : null } |
  {
    'upgrade' : [] | [
      {
        'wasm_memory_persistence' : [] | [
          { 'keep' : null } |
            { 'replace' : null }
        ],
        'skip_pre_upgrade' : [] | [boolean],
      }
    ]
  } |
  { 'install' : null };
export type CanisterKind = { 'frontend' : null } |
  { 'backend' : null };
export interface ChunkHash { 'hash' : Uint8Array | number[] }
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
