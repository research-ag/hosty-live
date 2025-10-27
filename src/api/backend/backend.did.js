export const idlFactory = ({ IDL }) => {
  const CanisterInfo = IDL.Record({
    'userId' : IDL.Principal,
    'createdAt' : IDL.Nat64,
    'frontendUrl' : IDL.Text,
    'deletedAt' : IDL.Opt(IDL.Nat64),
    'canisterId' : IDL.Principal,
  });
  const PublicCanisterInfo = IDL.Record({
    'createdAt' : IDL.Nat64,
    'frontendUrl' : IDL.Text,
    'deletedAt' : IDL.Opt(IDL.Nat64),
    'canisterId' : IDL.Principal,
  });
  return IDL.Service({
    'deleteCanister' : IDL.Func([IDL.Principal], [], []),
    'getCanister' : IDL.Func([IDL.Principal], [CanisterInfo], ['query']),
    'getPublicCanister' : IDL.Func(
        [IDL.Principal],
        [PublicCanisterInfo],
        ['query'],
      ),
    'listCanisters' : IDL.Func([], [IDL.Vec(CanisterInfo)], ['query']),
    'registerCanister' : IDL.Func([IDL.Principal], [CanisterInfo], []),
  });
};
export const init = ({ IDL }) => { return []; };