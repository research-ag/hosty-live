import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface CanisterStatus {
  'memory_metrics' : MemoryMetrics,
  'status' : { 'stopped' : null } |
    { 'stopping' : null } |
    { 'running' : null },
  'memory_size' : bigint,
  'cycles' : bigint,
  'settings' : DefiniteCanisterSettings,
  'query_stats' : QueryStats,
  'idle_cycles_burned_per_day' : bigint,
  'module_hash' : [] | [Uint8Array | number[]],
  'reserved_cycles' : bigint,
}
export interface DefiniteCanisterSettings {
  'freezing_threshold' : bigint,
  'controllers' : Array<Principal>,
  'reserved_cycles_limit' : bigint,
  'log_visibility' : { 'controllers' : null } |
    { 'public' : null } |
    { 'allowed_viewers' : Array<Principal> },
  'wasm_memory_limit' : bigint,
  'memory_allocation' : bigint,
  'compute_allocation' : bigint,
}
export interface MemoryMetrics {
  'wasm_binary_size' : bigint,
  'wasm_chunk_store_size' : bigint,
  'canister_history_size' : bigint,
  'stable_memory_size' : bigint,
  'snapshots_size' : bigint,
  'wasm_memory_size' : bigint,
  'global_memory_size' : bigint,
  'custom_sections_size' : bigint,
}
export interface QueryStats {
  'response_payload_bytes_total' : bigint,
  'num_instructions_total' : bigint,
  'num_calls_total' : bigint,
  'request_payload_bytes_total' : bigint,
}
export interface _SERVICE {
  'invalidateCache' : ActorMethod<[Principal], boolean>,
  'isImmutableInDebugMode' : ActorMethod<[Principal], [] | [Array<Principal>]>,
  'loadState' : ActorMethod<[Principal], [bigint, CanisterStatus]>,
  'makeImmutable' : ActorMethod<[Principal, boolean], undefined>,
  'queryState' : ActorMethod<[Principal], [] | [[bigint, CanisterStatus]]>,
  'undoImmutability' : ActorMethod<[Principal], undefined>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];