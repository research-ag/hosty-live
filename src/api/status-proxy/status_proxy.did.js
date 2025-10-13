export const idlFactory = ({ IDL }) => {
  const MemoryMetrics = IDL.Record({
    'wasm_binary_size' : IDL.Nat,
    'wasm_chunk_store_size' : IDL.Nat,
    'canister_history_size' : IDL.Nat,
    'stable_memory_size' : IDL.Nat,
    'snapshots_size' : IDL.Nat,
    'wasm_memory_size' : IDL.Nat,
    'global_memory_size' : IDL.Nat,
    'custom_sections_size' : IDL.Nat,
  });
  const DefiniteCanisterSettings = IDL.Record({
    'freezing_threshold' : IDL.Nat,
    'controllers' : IDL.Vec(IDL.Principal),
    'reserved_cycles_limit' : IDL.Nat,
    'log_visibility' : IDL.Variant({
      'controllers' : IDL.Null,
      'public' : IDL.Null,
      'allowed_viewers' : IDL.Vec(IDL.Principal),
    }),
    'wasm_memory_limit' : IDL.Nat,
    'memory_allocation' : IDL.Nat,
    'compute_allocation' : IDL.Nat,
  });
  const QueryStats = IDL.Record({
    'response_payload_bytes_total' : IDL.Nat,
    'num_instructions_total' : IDL.Nat,
    'num_calls_total' : IDL.Nat,
    'request_payload_bytes_total' : IDL.Nat,
  });
  const CanisterStatus = IDL.Record({
    'memory_metrics' : MemoryMetrics,
    'status' : IDL.Variant({
      'stopped' : IDL.Null,
      'stopping' : IDL.Null,
      'running' : IDL.Null,
    }),
    'memory_size' : IDL.Nat,
    'cycles' : IDL.Nat,
    'settings' : DefiniteCanisterSettings,
    'query_stats' : QueryStats,
    'idle_cycles_burned_per_day' : IDL.Nat,
    'module_hash' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'reserved_cycles' : IDL.Nat,
  });
  return IDL.Service({
    'isImmutableInDebugMode' : IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    'loadState' : IDL.Func([IDL.Principal], [IDL.Nat64, CanisterStatus], []),
    'makeImmutable' : IDL.Func([IDL.Principal, IDL.Bool], [], []),
    'queryState' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(IDL.Tuple(IDL.Nat64, CanisterStatus))],
        ['query'],
    ),
    'undoImmutability' : IDL.Func([IDL.Principal], [], []),
  });
};
export const init = ({ IDL }) => { return []; };