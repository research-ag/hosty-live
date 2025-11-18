export const idlFactory = ({ IDL }) => {
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
  const Result = IDL.Variant({ 'ok' : CanisterInfo, 'err' : IDL.Text });
  return IDL.Service({
    'canRentCanister' : IDL.Func([], [IDL.Bool], ['query']),
    'deleteCanister' : IDL.Func([IDL.Principal], [], []),
    'donateCanister' : IDL.Func([IDL.Principal], [Result_1], []),
    'getCanister' : IDL.Func([IDL.Principal], [CanisterInfo], ['query']),
    'getProfile' : IDL.Func([], [IDL.Opt(ProfileInfo)], ['query']),
    'listCanisters' : IDL.Func([], [IDL.Vec(CanisterInfo)], ['query']),
    'onCanisterDeployed' : IDL.Func([IDL.Principal], [], []),
    'registerCanister' : IDL.Func([IDL.Principal], [CanisterInfo], []),
    'rentCanister' : IDL.Func([], [Result], []),
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
};
export const init = ({ IDL }) => { return []; };