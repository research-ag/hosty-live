export const idlFactory = ({ IDL }) => {
  const CanisterInfo = IDL.Record({
    'userId' : IDL.Principal,
    'createdAt' : IDL.Nat64,
    'updatedAt' : IDL.Nat64,
    'frontendUrl' : IDL.Text,
    'deletedAt' : IDL.Opt(IDL.Nat64),
    'canisterId' : IDL.Principal,
  });
  const ProfileInfo = IDL.Record({
    'username' : IDL.Opt(IDL.Text),
    'userId' : IDL.Principal,
    'createdAt' : IDL.Nat64,
    'updatedAt' : IDL.Nat64,
    'freeCanisterClaimedAt' : IDL.Opt(IDL.Nat64),
  });
  return IDL.Service({
    'deleteCanister' : IDL.Func([IDL.Principal], [], []),
    'getCanister' : IDL.Func([IDL.Principal], [CanisterInfo], ['query']),
    'getProfile' : IDL.Func([], [IDL.Opt(ProfileInfo)], ['query']),
    'listCanisters' : IDL.Func([], [IDL.Vec(CanisterInfo)], ['query']),
    'registerCanister' : IDL.Func([IDL.Principal], [CanisterInfo], []),
    'updateProfile' : IDL.Func(
        [IDL.Record({ 'username' : IDL.Opt(IDL.Text) })],
        [ProfileInfo],
        [],
    ),
    'updateTimestamp' : IDL.Func([IDL.Principal], [], []),
  });
};
export const init = ({ IDL }) => { return []; };