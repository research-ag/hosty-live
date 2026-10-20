module {

  public type ManagementCanisterActor = actor {
    canister_status : shared ({ canister_id : Principal }) -> async CanisterStatus;
    create_canister : shared ({
      settings : ?CanisterSettings;
      sender_canister_version : ?Nat64;
    }) -> async ({ canister_id : Principal });
    update_settings : shared ({
      canister_id : Principal;
      settings : {
        controllers : ?[Principal];
        freezing_threshold : ?Nat;
        // Replaces the whole list; ?[] clears it, null leaves it unchanged.
        environment_variables : ?[EnvironmentVariable];
      };
    }) -> async ();
    install_code : (InstallCodeArgs) -> async ();
    upload_chunk : ({ canister_id : Principal; chunk : Blob }) -> async ChunkHash;
    clear_chunk_store : ({ canister_id : Principal }) -> async ();
    install_chunked_code : (InstallChunkedCodeArgs) -> async ();
    take_canister_snapshot : ({ canister_id : Principal; replace_snapshot : ?Blob }) -> async Snapshot;
    load_canister_snapshot : ({ canister_id : Principal; snapshot_id : Blob; sender_canister_version : ?Nat64 }) -> async ();
    list_canister_snapshots : ({ canister_id : Principal }) -> async [Snapshot];
    delete_canister_snapshot : ({ canister_id : Principal; snapshot_id : Blob }) -> async ();
    deposit_cycles : ({ canister_id : Principal }) -> async ();
    delete_canister : ({ canister_id : Principal }) -> async ();
    start_canister : ({ canister_id : Principal }) -> async ();
    stop_canister : ({ canister_id : Principal }) -> async ();
  };

  public type CanisterStatus = {
    status : { #stopped; #stopping; #running };
    settings : DefiniteCanisterSettings;
    module_hash : ?Blob;
    memory_size : Nat;
    memory_metrics : MemoryMetrics;
    cycles : Nat;
    idle_cycles_burned_per_day : Nat;
    reserved_cycles : Nat;
    query_stats : QueryStats;
  };

  public type MemoryMetrics = {
    wasm_memory_size : Nat;
    stable_memory_size : Nat;
    global_memory_size : Nat;
    wasm_binary_size : Nat;
    custom_sections_size : Nat;
    canister_history_size : Nat;
    wasm_chunk_store_size : Nat;
    snapshots_size : Nat;
  };

  public type DefiniteCanisterSettings = {
    controllers : [Principal];
    compute_allocation : Nat;
    memory_allocation : Nat;
    freezing_threshold : Nat;
    reserved_cycles_limit : Nat;
    log_visibility : { #controllers; #allowed_viewers : [Principal]; #public_ };
    wasm_memory_limit : Nat;
  };

  // `definite_canister_settings` also reports `environment_variables`; DefiniteCanisterSettings
  // leaves it out on purpose: the blackholed status proxy caches and returns this type, so its
  // replies (decoded by the backend) do not carry the field.
  public type EnvironmentVariable = { name : Text; value : Text };

  public type CanisterSettings = {
    environment_variables : ?[EnvironmentVariable];
    freezing_threshold : ?Nat;
    controllers : ?[Principal];
    reserved_cycles_limit : ?Nat;
    log_visibility : ?{ #controllers; #public_ };
    wasm_memory_limit : ?Nat;
    memory_allocation : ?Nat;
    compute_allocation : ?Nat;
  };

  public type QueryStats = {
    num_calls_total : Nat;
    num_instructions_total : Nat;
    request_payload_bytes_total : Nat;
    response_payload_bytes_total : Nat;
  };

  public type ChunkHash = { hash : Blob };

  public type Snapshot = {
    id : Blob;
    taken_at_timestamp : Nat64;
    total_size : Nat64;
  };

  public type InstallChunkedCodeArgs = {
    mode : CanisterInstallMode;
    target_canister : Principal;
    store_canister : ?Principal;
    chunk_hashes_list : [ChunkHash];
    wasm_module_hash : Blob;
    arg : Blob;
    sender_canister_version : ?Nat64;
  };

  public type InstallCodeArgs = {
    mode : CanisterInstallMode;
    canister_id : Principal;
    wasm_module : Blob;
    arg : Blob;
    sender_canister_version : ?Nat64;
  };

  public type CanisterInstallMode = {
    #install;
    #reinstall;
    #upgrade : ?{
      skip_pre_upgrade : ?Bool;
      wasm_memory_persistence : ?{
        #keep;
        #replace;
      };
    };
  };

  public func getActor() : ManagementCanisterActor = actor ("aaaaa-aa");

};
