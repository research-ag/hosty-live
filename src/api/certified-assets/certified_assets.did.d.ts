import type { Principal } from 'npm:@icp-sdk/core/principal';
import type { ActorMethod } from 'npm:@icp-sdk/core/agent';
import type { IDL } from 'npm:@icp-sdk/core/candid';

export interface AssetDetails {
  'key' : Key,
  'encodings' : Array<AssetEncodingDetails>,
  'content_type' : string,
  'headers' : Array<HeaderField>,
}
export interface AssetEncodingDetails {
  'sha256' : Uint8Array | number[],
  'encoding' : Encoding,
}
export type ChunkId = bigint;
export interface CreateAssetArguments {
  'key' : Key,
  'content_type' : string,
  'headers' : Array<HeaderField>,
}
export interface DeleteAssetArguments { 'key' : Key }
export type Encoding = { 'Gzip' : null } |
  { 'Brotli' : null } |
  { 'Identity' : null };
export interface ExecuteOperationsArguments {
  'is_final' : boolean,
  'session_id' : SessionId,
  'operations' : Array<Operation>,
}
export type HeaderField = [string, string];
export interface HttpRequest {
  'url' : string,
  'method' : string,
  'body' : Uint8Array | number[],
  'headers' : Array<HeaderField>,
  'certificate_version' : [] | [number],
}
export interface HttpResponse {
  'body' : Uint8Array | number[],
  'headers' : Array<HeaderField>,
  'upgrade' : [] | [boolean],
  'status_code' : number,
}
export interface InitArgs {
  'authorize' : [] | [Array<Principal>],
  'governance' : [] | [Principal],
}
export interface IssueTokenArgs {
  'value' : [] | [string],
  'label' : string,
  'ttl_secs' : number,
}
export type Key = string;
export type Operation = { 'SetAssetHeaders' : SetAssetHeadersArguments } |
  { 'CreateAsset' : CreateAssetArguments } |
  { 'UnsetAssetContent' : UnsetAssetContentArguments } |
  { 'SetRedirectRules' : SetRedirectRulesArguments } |
  { 'DeleteAsset' : DeleteAssetArguments } |
  { 'SetAssetContent' : SetAssetContentArguments } |
  { 'SetPreparationCanary' : SetPreparationCanaryArguments };
export type ProposedState = { 'None' : null } |
  {
    'Staged' : {
      'prepared_at' : bigint,
      'owner' : Principal,
      'prospective_state_hash' : string,
      'changed_assets' : bigint,
      'base_state_hash' : string,
    }
  } |
  { 'Preparing' : { 'owner' : Principal } };
export type ProtectionStatus = { 'Enabled' : { 'login_page' : Key } } |
  { 'Disabled' : null } |
  { 'EnabledLoginPageMissing' : { 'login_page' : Key } };
export interface RedirectRule {
  'to' : string,
  'status' : number,
  'from' : RulePattern,
  'headers' : Array<HeaderField>,
}
export type RulePattern = { 'Exact' : string } |
  { 'Subtree' : string };
export type SessionId = bigint;
export interface SetAssetContentArguments {
  'key' : Key,
  'sha256' : Uint8Array | number[],
  'encoding' : Encoding,
  'chunk_ids' : BigUint64Array | bigint[],
  'chunk_sha256' : Array<Uint8Array | number[]>,
}
export interface SetAssetHeadersArguments {
  'key' : Key,
  'headers' : Array<HeaderField>,
}
export interface SetPreparationCanaryArguments {
  'canary' : Uint8Array | number[],
}
export interface SetRedirectRulesArguments { 'rules' : Array<RedirectRule> }
export type StartSyncResult = { 'Started' : { 'session_id' : SessionId } } |
  { 'Busy' : { 'idle_for_secs' : bigint, 'owner' : Principal } };
export interface TokenInfo { 'label' : string, 'expires_at' : bigint }
export interface UnsetAssetContentArguments {
  'key' : Key,
  'encoding' : Encoding,
}
export interface UploadChunksArguments {
  'session_id' : SessionId,
  'chunks' : Array<Uint8Array | number[]>,
}
export type WalletResult = { 'Ok' : null } |
  { 'Err' : string };
export interface _SERVICE {
  'authorize' : ActorMethod<[Principal], undefined>,
  'can_sync' : ActorMethod<[], boolean>,
  'check_protection_status' : ActorMethod<[], ProtectionStatus>,
  'commit_proposed_state' : ActorMethod<[string], undefined>,
  'deauthorize' : ActorMethod<[Principal], undefined>,
  'disable_protection' : ActorMethod<[], undefined>,
  'discard_proposed_state' : ActorMethod<[], undefined>,
  'enable_protection' : ActorMethod<[Key], undefined>,
  'execute_operations' : ActorMethod<
    [ExecuteOperationsArguments],
    [] | [Uint8Array | number[]]
  >,
  'get_asset_details' : ActorMethod<[[] | [Key]], Array<AssetDetails>>,
  'get_redirect_rules' : ActorMethod<[bigint], Array<RedirectRule>>,
  'governance' : ActorMethod<[], [] | [Principal]>,
  'http_request' : ActorMethod<[HttpRequest], HttpResponse>,
  'issue_token' : ActorMethod<[IssueTokenArgs], string>,
  'list_authorized' : ActorMethod<[], Array<Principal>>,
  'list_tokens' : ActorMethod<[], Array<TokenInfo>>,
  'preparation_canary' : ActorMethod<[], Uint8Array | number[]>,
  'proposed_state' : ActorMethod<[], ProposedState>,
  'refresh_env' : ActorMethod<[], undefined>,
  'revoke_token' : ActorMethod<[string], undefined>,
  'set_governance' : ActorMethod<[[] | [Principal]], undefined>,
  'start_sync' : ActorMethod<[], StartSyncResult>,
  'state_hash' : ActorMethod<[], Uint8Array | number[]>,
  'tcycles_deposit' : ActorMethod<
    [
      {
        'deposit_args' : {
          'to' : {
            'owner' : Principal,
            'subaccount' : [] | [Uint8Array | number[]],
          },
          'memo' : [] | [Uint8Array | number[]],
        },
        'amount' : bigint,
      },
    ],
    undefined
  >,
  'upload_chunks' : ActorMethod<
    [UploadChunksArguments],
    BigUint64Array | bigint[]
  >,
  'validate_authorize' : ActorMethod<
    [Principal],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'validate_commit_proposed_state' : ActorMethod<
    [string],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'validate_deauthorize' : ActorMethod<
    [Principal],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'version' : ActorMethod<
    [],
    { 'major' : number, 'minor' : number, 'patch' : number }
  >,
  'wallet_balance' : ActorMethod<[], { 'amount' : bigint }>,
  'wallet_send' : ActorMethod<
    [{ 'canister' : Principal, 'amount' : bigint }],
    WalletResult
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
