export const idlFactory = ({ IDL }) => {
  const DeploymentExampleInput = IDL.Record({
    'url' : IDL.Text,
    'kind' : IDL.Variant({ 'git' : IDL.Text, 'archive' : IDL.Null }),
    'assets' : IDL.Variant({
      'pure' : IDL.Null,
      'build' : IDL.Record({ 'command' : IDL.Text, 'envVars' : IDL.Text }),
    }),
    'description' : IDL.Text,
    'assetsDir' : IDL.Text,
  });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const CanisterKind = IDL.Variant({
    'frontend' : IDL.Null,
    'backend' : IDL.Null,
  });
  const CanisterNetwork = IDL.Variant({
    'mainnet' : IDL.Null,
    'testnet' : IDL.Null,
  });
  const CanisterInfo = IDL.Record({
    'alias' : IDL.Opt(IDL.Text),
    'deployedAt' : IDL.Opt(IDL.Nat64),
    'kind' : CanisterKind,
    'createdAt' : IDL.Nat64,
    'network' : CanisterNetwork,
    'description' : IDL.Opt(IDL.Text),
    'userIds' : IDL.Vec(IDL.Principal),
    'frontendUrl' : IDL.Text,
    'deletedAt' : IDL.Opt(IDL.Nat64),
    'canisterId' : IDL.Principal,
    'ownedBySystem' : IDL.Bool,
  });
  const ProfileInfo = IDL.Record({
    'username' : IDL.Opt(IDL.Text),
    'userId' : IDL.Principal,
    'createdAt' : IDL.Nat64,
    'updatedAt' : IDL.Nat64,
    'rentedCanister' : IDL.Opt(IDL.Tuple(CanisterInfo, IDL.Nat64)),
  });
  const Request = IDL.Record({
    'url' : IDL.Text,
    'method' : IDL.Text,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
  });
  const Response = IDL.Record({
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'status_code' : IDL.Nat16,
  });
  const CanisterInstallMode = IDL.Variant({
    'reinstall' : IDL.Null,
    'upgrade' : IDL.Opt(
      IDL.Record({
        'wasm_memory_persistence' : IDL.Opt(
          IDL.Variant({ 'keep' : IDL.Null, 'replace' : IDL.Null })
        ),
        'skip_pre_upgrade' : IDL.Opt(IDL.Bool),
      })
    ),
    'install' : IDL.Null,
  });
  const DeploymentExample = IDL.Record({
    'url' : IDL.Text,
    'owner' : IDL.Opt(IDL.Principal),
    'kind' : IDL.Variant({ 'git' : IDL.Text, 'archive' : IDL.Null }),
    'assets' : IDL.Variant({
      'pure' : IDL.Null,
      'build' : IDL.Record({ 'command' : IDL.Text, 'envVars' : IDL.Text }),
    }),
    'description' : IDL.Text,
    'assetsDir' : IDL.Text,
  });
  const Snapshot = IDL.Record({
    'id' : IDL.Vec(IDL.Nat8),
    'total_size' : IDL.Nat64,
    'taken_at_timestamp' : IDL.Nat64,
  });
  const Result = IDL.Variant({ 'ok' : CanisterInfo, 'err' : IDL.Text });
  const CanisterUpdates = IDL.Record({
    'alias' : IDL.Opt(IDL.Opt(IDL.Text)),
    'description' : IDL.Opt(IDL.Opt(IDL.Text)),
    'frontendUrl' : IDL.Opt(IDL.Text),
  });
  const ChunkHash = IDL.Record({ 'hash' : IDL.Vec(IDL.Nat8) });
  const Backend = IDL.Service({
    'addDeploymentExample' : IDL.Func([DeploymentExampleInput], [], []),
    'canRentCanister' : IDL.Func([], [IDL.Bool], ['query']),
    'clearWasmChunks' : IDL.Func([IDL.Principal, IDL.Principal], [], []),
    'countTestnetCanisters' : IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'deleteCanister' : IDL.Func([IDL.Principal], [], []),
    'deleteSnapshot' : IDL.Func(
        [IDL.Principal, IDL.Principal, IDL.Vec(IDL.Nat8)],
        [],
        [],
      ),
    'donateCanister' : IDL.Func([IDL.Principal], [Result_1], []),
    'getCanister' : IDL.Func([IDL.Principal], [CanisterInfo], ['query']),
    'getProfile' : IDL.Func([], [IDL.Opt(ProfileInfo)], ['query']),
    'http_request' : IDL.Func([Request], [Response], ['query']),
    'installCode' : IDL.Func(
        [
          IDL.Principal,
          IDL.Principal,
          CanisterInstallMode,
          IDL.Vec(IDL.Nat8),
          IDL.Vec(IDL.Nat8),
          IDL.Vec(IDL.Vec(IDL.Nat8)),
        ],
        [],
        [],
      ),
    'listCanisters' : IDL.Func([], [IDL.Vec(CanisterInfo)], ['query']),
    'listDeploymentExamples' : IDL.Func(
        [],
        [IDL.Vec(DeploymentExample)],
        ['query'],
      ),
    'listSnapshots' : IDL.Func(
        [IDL.Principal, IDL.Principal],
        [IDL.Vec(Snapshot)],
        [],
      ),
    'listTestnetCanisters' : IDL.Func([], [IDL.Vec(CanisterInfo)], ['query']),
    'listUserCanisters' : IDL.Func(
        [IDL.Principal],
        [
          IDL.Record({
            'rented' : IDL.Opt(IDL.Tuple(CanisterInfo, IDL.Nat64)),
            'owned' : IDL.Vec(CanisterInfo),
          }),
        ],
        ['query'],
      ),
    'loadSnapshot' : IDL.Func(
        [IDL.Principal, IDL.Principal, IDL.Vec(IDL.Nat8)],
        [],
        [],
      ),
    'lowerFreezingThreshold' : IDL.Func(
        [IDL.Principal, IDL.Principal],
        [IDL.Record({ 'previous' : IDL.Nat, 'current' : IDL.Nat })],
        [],
      ),
    'markTestnetCanisterDeleted' : IDL.Func([IDL.Principal], [], []),
    'onCanisterDeployed' : IDL.Func([IDL.Principal], [], []),
    'preparePoolCanisters' : IDL.Func([], [IDL.Nat], []),
    'registerCanister' : IDL.Func([IDL.Principal], [CanisterInfo], []),
    'registerTestnetCanister' : IDL.Func(
        [
          IDL.Principal,
          IDL.Principal,
          CanisterKind,
          IDL.Opt(IDL.Text),
          IDL.Text,
        ],
        [CanisterInfo],
        [],
      ),
    'rentCanister' : IDL.Func([], [Result], []),
    'rentCanisterFor' : IDL.Func([IDL.Principal], [Result], []),
    'restartScheduler' : IDL.Func([], [], []),
    'setAssetsModule' : IDL.Func(
        [IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Nat8)],
        [],
        [],
      ),
    'setCanisterKind' : IDL.Func(
        [IDL.Principal, CanisterKind],
        [CanisterInfo],
        [],
      ),
    'setCanisterKindFor' : IDL.Func(
        [IDL.Principal, IDL.Principal, CanisterKind],
        [CanisterInfo],
        [],
      ),
    'setMaxRentals' : IDL.Func([IDL.Nat], [], []),
    'takeSnapshot' : IDL.Func(
        [IDL.Principal, IDL.Principal, IDL.Opt(IDL.Vec(IDL.Nat8))],
        [Snapshot],
        [],
      ),
    'undoDonation' : IDL.Func([IDL.Principal, IDL.Principal], [], []),
    'updateCanister' : IDL.Func(
        [IDL.Principal, CanisterUpdates],
        [CanisterInfo],
        [],
      ),
    'updateCanisterFor' : IDL.Func(
        [
          IDL.Principal,
          IDL.Principal,
          IDL.Record({
            'alias' : IDL.Opt(IDL.Opt(IDL.Text)),
            'description' : IDL.Opt(IDL.Opt(IDL.Text)),
          }),
        ],
        [CanisterInfo],
        [],
      ),
    'updateProfile' : IDL.Func(
        [IDL.Record({ 'username' : IDL.Opt(IDL.Text) })],
        [ProfileInfo],
        [],
      ),
    'uploadWasmChunk' : IDL.Func(
        [IDL.Principal, IDL.Principal, IDL.Vec(IDL.Nat8)],
        [ChunkHash],
        [],
      ),
  });
  return Backend;
};
export const init = ({ IDL }) => { return []; };
