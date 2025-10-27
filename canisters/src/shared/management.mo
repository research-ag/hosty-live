module {

  public type ManagementCanisterActor = actor {
    update_settings : shared ({
      canister_id : Principal;
      settings : { controllers : ?[Principal] };
    }) -> async ();
    install_code : (InstallCodeArgs) -> async ();
    canister_status : shared ({ canister_id : Principal }) -> async CanisterStatus;
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

  public type QueryStats = {
    num_calls_total : Nat;
    num_instructions_total : Nat;
    request_payload_bytes_total : Nat;
    response_payload_bytes_total : Nat;
  };

  public type InstallCodeArgs = {
    mode : CanisterInstallMode;
    canister_id : Principal;
    wasm_module : Blob;
    arg : Blob;
    sender_canister_version : ?Nat64;
  };

  type CanisterInstallMode = {
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
