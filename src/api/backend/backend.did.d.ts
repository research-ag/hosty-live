import type { Principal } from '@icp-sdk/core/principal';
import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';

export interface CanisterInfo {
  'alias': [] | [string],
  'deployedAt': [] | [bigint],
  'createdAt': bigint,
  'description': [] | [string],
  'userIds': Array<Principal>,
  'frontendUrl': string,
  'deletedAt': [] | [bigint],
  'canisterId': Principal,
  'ownedBySystem': boolean,
}

export interface DeploymentExample {
  'url': string,
  'kind': { 'git': string } |
    { 'archive': null },
  'description': string,
  'envVars': string,
  'buildCommand': string,
  'outputDir': string,
}

export interface ProfileInfo {
  'username': [] | [string],
  'userId': Principal,
  'createdAt': bigint,
  'updatedAt': bigint,
  'rentedCanister': [] | [[CanisterInfo, bigint]],
}

export type Result = { 'ok': CanisterInfo } |
  { 'err': string };
export type Result_1 = { 'ok': null } |
  { 'err': string };

export interface _SERVICE {
  'addDeploymentExample': ActorMethod<[DeploymentExample], undefined>,
  'canRentCanister': ActorMethod<[], boolean>,
  'deleteCanister': ActorMethod<[Principal], undefined>,
  'donateCanister': ActorMethod<[Principal], Result_1>,
  'getCanister': ActorMethod<[Principal], CanisterInfo>,
  'getProfile': ActorMethod<[], [] | [ProfileInfo]>,
  'listCanisters': ActorMethod<[], Array<CanisterInfo>>,
  'listDeploymentExamples': ActorMethod<[], Array<DeploymentExample>>,
  'onCanisterDeployed': ActorMethod<[Principal], undefined>,
  'registerCanister': ActorMethod<[Principal], CanisterInfo>,
  'rentCanister': ActorMethod<[], Result>,
  'updateCanister': ActorMethod<
    [
      Principal,
      {
        'alias': [] | [[] | [string]],
        'description': [] | [[] | [string]],
        'frontendUrl': [] | [string],
      },
    ],
    CanisterInfo
  >,
  'updateProfile': ActorMethod<[{ 'username': [] | [string] }], ProfileInfo>,
}

export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];