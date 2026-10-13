export const idlFactory = ({ IDL }) => {
  const InitArgs = IDL.Record({
    'authorize' : IDL.Opt(IDL.Vec(IDL.Principal)),
    'governance' : IDL.Opt(IDL.Principal),
  });
  const Key = IDL.Text;
  const ProtectionStatus = IDL.Variant({
    'Enabled' : IDL.Record({ 'login_page' : Key }),
    'Disabled' : IDL.Null,
    'EnabledLoginPageMissing' : IDL.Record({ 'login_page' : Key }),
  });
  const SessionId = IDL.Nat64;
  const HeaderField = IDL.Tuple(IDL.Text, IDL.Text);
  const SetAssetHeadersArguments = IDL.Record({
    'key' : Key,
    'headers' : IDL.Vec(HeaderField),
  });
  const CreateAssetArguments = IDL.Record({
    'key' : Key,
    'content_type' : IDL.Text,
    'headers' : IDL.Vec(HeaderField),
  });
  const Encoding = IDL.Variant({
    'Gzip' : IDL.Null,
    'Brotli' : IDL.Null,
    'Identity' : IDL.Null,
  });
  const UnsetAssetContentArguments = IDL.Record({
    'key' : Key,
    'encoding' : Encoding,
  });
  const RulePattern = IDL.Variant({ 'Exact' : IDL.Text, 'Subtree' : IDL.Text });
  const RedirectRule = IDL.Record({
    'to' : IDL.Text,
    'status' : IDL.Nat16,
    'from' : RulePattern,
    'headers' : IDL.Vec(HeaderField),
  });
  const SetRedirectRulesArguments = IDL.Record({
    'rules' : IDL.Vec(RedirectRule),
  });
  const DeleteAssetArguments = IDL.Record({ 'key' : Key });
  const ChunkId = IDL.Nat64;
  const SetAssetContentArguments = IDL.Record({
    'key' : Key,
    'sha256' : IDL.Vec(IDL.Nat8),
    'encoding' : Encoding,
    'chunk_ids' : IDL.Vec(ChunkId),
    'chunk_sha256' : IDL.Vec(IDL.Vec(IDL.Nat8)),
  });
  const SetPreparationCanaryArguments = IDL.Record({
    'canary' : IDL.Vec(IDL.Nat8),
  });
  const Operation = IDL.Variant({
    'SetAssetHeaders' : SetAssetHeadersArguments,
    'CreateAsset' : CreateAssetArguments,
    'UnsetAssetContent' : UnsetAssetContentArguments,
    'SetRedirectRules' : SetRedirectRulesArguments,
    'DeleteAsset' : DeleteAssetArguments,
    'SetAssetContent' : SetAssetContentArguments,
    'SetPreparationCanary' : SetPreparationCanaryArguments,
  });
  const ExecuteOperationsArguments = IDL.Record({
    'is_final' : IDL.Bool,
    'session_id' : SessionId,
    'operations' : IDL.Vec(Operation),
  });
  const AssetEncodingDetails = IDL.Record({
    'sha256' : IDL.Vec(IDL.Nat8),
    'encoding' : Encoding,
  });
  const AssetDetails = IDL.Record({
    'key' : Key,
    'encodings' : IDL.Vec(AssetEncodingDetails),
    'content_type' : IDL.Text,
    'headers' : IDL.Vec(HeaderField),
  });
  const HttpRequest = IDL.Record({
    'url' : IDL.Text,
    'method' : IDL.Text,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(HeaderField),
    'certificate_version' : IDL.Opt(IDL.Nat16),
  });
  const HttpResponse = IDL.Record({
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(HeaderField),
    'upgrade' : IDL.Opt(IDL.Bool),
    'status_code' : IDL.Nat16,
  });
  const IssueTokenArgs = IDL.Record({
    'value' : IDL.Opt(IDL.Text),
    'label' : IDL.Text,
    'ttl_secs' : IDL.Nat32,
  });
  const TokenInfo = IDL.Record({
    'label' : IDL.Text,
    'expires_at' : IDL.Nat64,
  });
  const ProposedState = IDL.Variant({
    'None' : IDL.Null,
    'Staged' : IDL.Record({
      'prepared_at' : IDL.Nat64,
      'owner' : IDL.Principal,
      'prospective_state_hash' : IDL.Text,
      'changed_assets' : IDL.Nat64,
      'base_state_hash' : IDL.Text,
    }),
    'Preparing' : IDL.Record({ 'owner' : IDL.Principal }),
  });
  const StartSyncResult = IDL.Variant({
    'Started' : IDL.Record({ 'session_id' : SessionId }),
    'Busy' : IDL.Record({
      'idle_for_secs' : IDL.Nat64,
      'owner' : IDL.Principal,
    }),
  });
  const UploadChunksArguments = IDL.Record({
    'session_id' : SessionId,
    'chunks' : IDL.Vec(IDL.Vec(IDL.Nat8)),
  });
  const WalletResult = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  return IDL.Service({
    'authorize' : IDL.Func([IDL.Principal], [], []),
    'can_sync' : IDL.Func([], [IDL.Bool], ['query']),
    'check_protection_status' : IDL.Func([], [ProtectionStatus], ['query']),
    'commit_proposed_state' : IDL.Func([IDL.Text], [], []),
    'deauthorize' : IDL.Func([IDL.Principal], [], []),
    'disable_protection' : IDL.Func([], [], []),
    'discard_proposed_state' : IDL.Func([], [], []),
    'enable_protection' : IDL.Func([Key], [], []),
    'execute_operations' : IDL.Func(
        [ExecuteOperationsArguments],
        [IDL.Opt(IDL.Vec(IDL.Nat8))],
        [],
      ),
    'get_asset_details' : IDL.Func(
        [IDL.Opt(Key)],
        [IDL.Vec(AssetDetails)],
        ['query'],
      ),
    'get_redirect_rules' : IDL.Func(
        [IDL.Nat64],
        [IDL.Vec(RedirectRule)],
        ['query'],
      ),
    'governance' : IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
    'http_request' : IDL.Func([HttpRequest], [HttpResponse], ['query']),
    'issue_token' : IDL.Func([IssueTokenArgs], [IDL.Text], []),
    'list_authorized' : IDL.Func([], [IDL.Vec(IDL.Principal)], []),
    'list_tokens' : IDL.Func([], [IDL.Vec(TokenInfo)], ['query']),
    'preparation_canary' : IDL.Func([], [IDL.Vec(IDL.Nat8)], ['query']),
    'proposed_state' : IDL.Func([], [ProposedState], ['query']),
    'refresh_env' : IDL.Func([], [], []),
    'revoke_token' : IDL.Func([IDL.Text], [], []),
    'set_governance' : IDL.Func([IDL.Opt(IDL.Principal)], [], []),
    'start_sync' : IDL.Func([], [StartSyncResult], []),
    'state_hash' : IDL.Func([], [IDL.Vec(IDL.Nat8)], []),
    'tcycles_deposit' : IDL.Func(
        [
          IDL.Record({
            'deposit_args' : IDL.Record({
              'to' : IDL.Record({
                'owner' : IDL.Principal,
                'subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
              }),
              'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
            }),
            'amount' : IDL.Nat64,
          }),
        ],
        [],
        [],
      ),
    'upload_chunks' : IDL.Func([UploadChunksArguments], [IDL.Vec(ChunkId)], []),
    'validate_authorize' : IDL.Func(
        [IDL.Principal],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'validate_commit_proposed_state' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'validate_deauthorize' : IDL.Func(
        [IDL.Principal],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'version' : IDL.Func(
        [],
        [
          IDL.Record({
            'major' : IDL.Nat32,
            'minor' : IDL.Nat32,
            'patch' : IDL.Nat32,
          }),
        ],
        ['query'],
      ),
    'wallet_balance' : IDL.Func(
        [],
        [IDL.Record({ 'amount' : IDL.Nat64 })],
        ['query'],
      ),
    'wallet_send' : IDL.Func(
        [IDL.Record({ 'canister' : IDL.Principal, 'amount' : IDL.Nat64 })],
        [WalletResult],
        [],
      ),
  });
};
export const init = ({ IDL }) => {
  const InitArgs = IDL.Record({
    'authorize' : IDL.Opt(IDL.Vec(IDL.Principal)),
    'governance' : IDL.Opt(IDL.Principal),
  });
  return [IDL.Opt(InitArgs)];
};
