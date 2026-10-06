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
  const CanisterInfo = IDL.Record({
    'alias' : IDL.Opt(IDL.Text),
    'deployedAt' : IDL.Opt(IDL.Nat64),
    'createdAt' : IDL.Nat64,
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
  const Result = IDL.Variant({ 'ok' : CanisterInfo, 'err' : IDL.Text });
  const Backend = IDL.Service({
    'addDeploymentExample' : IDL.Func([DeploymentExampleInput], [], []),
    'canRentCanister' : IDL.Func([], [IDL.Bool], ['query']),
    'deleteCanister' : IDL.Func([IDL.Principal], [], []),
    'donateCanister' : IDL.Func([IDL.Principal], [Result_1], []),
    'getCanister' : IDL.Func([IDL.Principal], [CanisterInfo], ['query']),
    'getProfile' : IDL.Func([], [IDL.Opt(ProfileInfo)], ['query']),
    'http_request' : IDL.Func([Request], [Response], ['query']),
    'listCanisters' : IDL.Func([], [IDL.Vec(CanisterInfo)], ['query']),
    'listDeploymentExamples' : IDL.Func(
        [],
        [IDL.Vec(DeploymentExample)],
        ['query'],
      ),
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
    'onCanisterDeployed' : IDL.Func([IDL.Principal], [], []),
    'registerCanister' : IDL.Func([IDL.Principal], [CanisterInfo], []),
    'rentCanister' : IDL.Func([], [Result], []),
    'rentCanisterFor' : IDL.Func([IDL.Principal], [Result], []),
    'restartScheduler' : IDL.Func([], [], []),
    'setAssetsModule' : IDL.Func(
        [IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Nat8)],
        [],
        [],
      ),
    'setMaxRentals' : IDL.Func([IDL.Nat], [], []),
    'undoDonation' : IDL.Func([IDL.Principal, IDL.Principal], [], []),
    'updateCanister' : IDL.Func(
        [
          IDL.Principal,
          IDL.Record({
            'alias' : IDL.Opt(IDL.Opt(IDL.Text)),
            'description' : IDL.Opt(IDL.Opt(IDL.Text)),
            'frontendUrl' : IDL.Opt(IDL.Text),
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
  });
  return Backend;
};
export const init = ({ IDL }) => { return []; };
