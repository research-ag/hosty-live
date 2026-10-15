import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Char "mo:core/Char";
import Error "mo:core/Error";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Nat32 "mo:core/Nat32";
import Nat64 "mo:core/Nat64";
import Option "mo:core/Option";
import Prim "mo:prim";
import Principal "mo:core/Principal";
import Queue "mo:core/Queue";
import R "mo:core/Result";
import Text "mo:core/Text";

import PT "mo:promtracker";

import Management "../shared/management";
import Assets "./assets";
import Scheduler "../shared/scheduler";
import Http "../shared/tiny_http";

// (
//   with migration = func(
//     old : {
//       profiles : Map.Map<Principal, { userId : Principal; var username : ?Text; createdAt : Nat64; var updatedAt : Nat64; var rentedCanister : ?(canisterIndex : Nat, rentUntil : Nat64) }>;
//       canisters : List.List<{ canisterId : Principal; var alias : ?Text; var description : ?Text; var userIds : [Principal]; var frontendUrl : Text; var ownedBySystem : Bool; createdAt : Nat64; var deployedAt : ?Nat64; var deletedAt : ?Nat64 }>;
//       userCanistersMap : Map.Map<Principal, List.List<Nat>>;
//       canisterIdMap : Map.Map<Principal, Nat>;
//       canistersPool : Queue.Queue<Nat>;
//       renters : Queue.Queue<Principal>;
//       var assetsModule : (Blob, Blob);
//       deploymentExamples : List.List<{ kind : { #git : Text; #archive }; url : Text; buildCommand : Text; outputDir : Text; envVars : Text; description : Text }>;
//     }
//   ) : {
//     profiles : Map.Map<Principal, { userId : Principal; var username : ?Text; createdAt : Nat64; var updatedAt : Nat64; var rentedCanister : ?(canisterIndex : Nat, rentUntil : Nat64) }>;
//     canisters : List.List<{ canisterId : Principal; var alias : ?Text; var description : ?Text; var userIds : [Principal]; var frontendUrl : Text; var ownedBySystem : Bool; createdAt : Nat64; var deployedAt : ?Nat64; var deletedAt : ?Nat64 }>;
//     userCanistersMap : Map.Map<Principal, List.List<Nat>>;
//     canisterIdMap : Map.Map<Principal, Nat>;
//     canistersPool : Queue.Queue<Nat>;
//     renters : Queue.Queue<Principal>;
//     var assetsModule : (Blob, Blob);
//     deploymentExamples : List.List<{ kind : { #git : Text; #archive }; url : Text; assetsDir : Text; assets : { #pure; #build : { command : Text; envVars : Text } }; description : Text; owner : ?Principal }>;
//   } {
//     {
//       old with
//       var assetsModule = old.assetsModule;
//       deploymentExamples = List.empty<{ kind : { #git : Text; #archive }; url : Text; assetsDir : Text; assets : { #pure; #build : { command : Text; envVars : Text } }; description : Text; owner : ?Principal }>();
//     };
//   }
// )
// Migration to the canister kind (ran on 2026-10-14):
// (
//   with migration = func(
//     old : {
//       canisters : List.List<{ canisterId : Principal; var alias : ?Text; var description : ?Text; var userIds : [Principal]; var frontendUrl : Text; var ownedBySystem : Bool; createdAt : Nat64; var deployedAt : ?Nat64; var deletedAt : ?Nat64 }>;
//     }
//   ) : {
//     canisters : List.List<{ canisterId : Principal; var alias : ?Text; var description : ?Text; var userIds : [Principal]; var frontendUrl : Text; var ownedBySystem : Bool; var kind : { #frontend; #backend }; createdAt : Nat64; var deployedAt : ?Nat64; var deletedAt : ?Nat64 }>;
//   } {
//     // Every canister registered before this version ran the hosty assets module.
//     {
//       canisters = List.map<{ canisterId : Principal; var alias : ?Text; var description : ?Text; var userIds : [Principal]; var frontendUrl : Text; var ownedBySystem : Bool; createdAt : Nat64; var deployedAt : ?Nat64; var deletedAt : ?Nat64 }, { canisterId : Principal; var alias : ?Text; var description : ?Text; var userIds : [Principal]; var frontendUrl : Text; var ownedBySystem : Bool; var kind : { #frontend; #backend }; createdAt : Nat64; var deployedAt : ?Nat64; var deletedAt : ?Nat64 }>(
//         old.canisters,
//         func(c) = {
//           canisterId = c.canisterId;
//           var alias = c.alias;
//           var description = c.description;
//           var userIds = c.userIds;
//           var frontendUrl = c.frontendUrl;
//           var ownedBySystem = c.ownedBySystem;
//           var kind = #frontend;
//           createdAt = c.createdAt;
//           var deployedAt = c.deployedAt;
//           var deletedAt = c.deletedAt;
//         },
//       );
//     };
//   }
// )
persistent actor class Backend() = self {

  transient let CONSTANTS = {
    STATUS_PROXY_CID = Principal.fromText("3jolg-2yaaa-aaaao-a4p3a-cai");
    BUILDER_PRINCIPALS : [Principal] = [
      Principal.fromText("i2qrn-wou4z-zo3z2-g6vlg-dma7w-siosb-tfkdt-gw2ut-s2tmr-66dzg-fae")
    ];
    CANISTER_RENT_PERIOD : Nat64 = 24 * 60 * 60 * 1_000_000_000; // 24 hours
    RENT_TAKEBACK_INTERVAL : Nat64 = 1_800; // 30 minutes
    POOL_CANISTER_MIN_CYCLES = 1_000_000_000_000;
    POOL_CANISTER_CYCLES_THRESHOLD = 800_000_000_000;
    // Max storage reservation top-ups per memory-growing step, see withReservationTopup_.
    MAX_RESERVATION_TOPUPS = 8;
    // Pool canisters often arrive with a 365-day freezing threshold (set by the web app
    // on reset). The assets canister grows memory on its first sync, and with such a
    // threshold the frozen reserve exceeds the pool balance, so installs fail with
    // "cannot grow memory due to insufficient cycles". 30 days keeps the reserve small.
    POOL_CANISTER_FREEZING_THRESHOLD = 30 * 24 * 60 * 60;
  };

  // What the canister is used for. Frontends run the hosty assets module and are
  // deployed by uploading files; backends run a user supplied module installed by
  // the hosty API under a delegation from the user.
  type CanisterKind = { #frontend; #backend };

  type CanisterData = {
    canisterId : Principal;
    var alias : ?Text;
    var description : ?Text;
    var userIds : [Principal];
    var frontendUrl : Text;
    var ownedBySystem : Bool;
    var kind : CanisterKind;
    createdAt : Nat64;
    var deployedAt : ?Nat64;
    var deletedAt : ?Nat64;
  };

  type Profile = {
    userId : Principal;
    var username : ?Text;
    createdAt : Nat64;
    var updatedAt : Nat64;
    var rentedCanister : ?(canisterIndex : Nat, rentUntil : Nat64);
  };

  type DeploymentExample = {
    description : Text;
    kind : { #git : Text; #archive };
    url : Text;
    assets : {
      #pure;
      #build : {
        command : Text;
        envVars : Text;
      };
    };
    assetsDir : Text;
    owner : ?Principal;
  };

  let profiles : Map.Map<Principal, Profile> = Map.empty();

  let canisters : List.List<CanisterData> = List.empty();
  let userCanistersMap : Map.Map<Principal, List.List<Nat>> = Map.empty();
  let canisterIdMap : Map.Map<Principal, Nat> = Map.empty();

  // list of system-owned canisters, that can be rented by users
  var canistersPool : Queue.Queue<Nat> = Queue.empty();
  // users who own rent canisters
  let renters : Queue.Queue<Principal> = Queue.empty();
  var maxRentals : Nat = 100;

  var assetsModule : (hash : Blob, wasm : Blob) = (Assets.HOSTY_ASSETS_MODULE_HASH, Assets.HOSTY_ASSETS_MODULE);
  // Stable, so the previous module would survive an upgrade: always re-assign the
  // embedded one so a deploy ships the module compiled in. setAssetsModule only
  // overrides it until the next upgrade.
  assetsModule := (Assets.HOSTY_ASSETS_MODULE_HASH, Assets.HOSTY_ASSETS_MODULE);

  let deploymentExamples : List.List<DeploymentExample> = List.empty();
  if (List.size(deploymentExamples) == 0) {
    List.addAll<DeploymentExample>(
      deploymentExamples,
      (
        [
          {
            description = "Hosty.live frontend itself!";
            kind = #git("main");
            url = "https://github.com/research-ag/hosty-live";
            assets = #build({
              command = "npm run build";
              envVars = "";
            });
            assetsDir = "dist";
            owner = null;
          },
          {
            description = "ICRC-1 web wallet";
            kind = #git("main");
            url = "https://github.com/research-ag/wallet";
            assets = #build({
              command = "npm run build";
              envVars = "";
            });
            assetsDir = "dist";
            owner = null;
          },
          {
            description = "Pure assets, no building";
            kind = #git("main");
            url = "https://github.com/itkrivoshei/Vanilla-Js-ToDoList";
            assets = #pure;
            assetsDir = "./";
            owner = null;
          },
          {
            description = "Notes app";
            kind = #git("main");
            url = "https://github.com/dcode-youtube/notes-app-javascript-localstorage";
            assets = #pure;
            assetsDir = "./";
            owner = null;
          },
          {
            description = "ICRC-1 web wallet (zip)";
            kind = #archive;
            url = "https://github.com/research-ag/wallet/archive/refs/tags/test-0.0.1.zip";
            assets = #build({
              command = "npm run build";
              envVars = "";
            });
            assetsDir = "dist";
            owner = null;
          },
          {
            description = "ICRC-1 web wallet (tar.gz)";
            kind = #archive;
            url = "https://github.com/research-ag/wallet/archive/refs/tags/test-0.0.1.tar.gz";
            assets = #build({
              command = "npm run build";
              envVars = "";
            });
            assetsDir = "dist";
            owner = null;
          },
        ] : [DeploymentExample]
      ).values(),
    );
  };

  type ProfileInfo = {
    userId : Principal;
    username : ?Text;
    createdAt : Nat64;
    updatedAt : Nat64;
    rentedCanister : ?(CanisterInfo, Nat64);
  };
  func freezeProfile_(cd : Profile) : ProfileInfo = {
    userId = cd.userId;
    username = cd.username;
    createdAt = cd.createdAt;
    updatedAt = cd.updatedAt;
    rentedCanister = switch (cd.rentedCanister) {
      case (?(idx, ts)) ?(freezeCanisterData_(List.at<CanisterData>(canisters, idx)), ts);
      case (null) null;
    };
  };

  type CanisterInfo = {
    canisterId : Principal;
    alias : ?Text;
    description : ?Text;
    userIds : [Principal];
    frontendUrl : Text;
    ownedBySystem : Bool;
    kind : CanisterKind;
    createdAt : Nat64;
    deployedAt : ?Nat64;
    deletedAt : ?Nat64;
  };
  func freezeCanisterData_(cd : CanisterData) : CanisterInfo = {
    canisterId = cd.canisterId;
    alias = cd.alias;
    description = cd.description;
    userIds = cd.userIds;
    frontendUrl = cd.frontendUrl;
    ownedBySystem = cd.ownedBySystem;
    kind = cd.kind;
    createdAt = cd.createdAt;
    deployedAt = cd.deployedAt;
    deletedAt = cd.deletedAt;
  };

  func getCanister_(cid : Principal) : ?(Nat, CanisterData) {
    let ?index = Map.get(canisterIdMap, Principal.compare, cid) else return null;
    ?(index, List.at<CanisterData>(canisters, index));
  };

  // profile api
  func getOrCreateProfile_(p : Principal) : Profile {
    switch (Map.get(profiles, Principal.compare, p)) {
      case (?profile) profile;
      case (null) {
        let profile : Profile = {
          userId = p;
          var username : ?Text = null;
          createdAt = Prim.time();
          var updatedAt = Prim.time();
          var rentedCanister = null;
        };
        Map.add<Principal, Profile>(profiles, Principal.compare, p, profile);
        profile;
      };
    };
  };

  transient let pt = PT.PromTracker("", 65);
  pt.addSystemValues();

  ignore pt.addPullValue("num_profiles", "", func() = Map.size(profiles));
  ignore pt.addPullValue("num_canisters", "", func() = List.size(canisters));
  ignore pt.addPullValue("num_canisters_in_pool", "", func() = Queue.size(canistersPool));
  transient var unattendedInstalls : Nat = 0;
  ignore pt.addPullValue("num_unattended_installs", "", func() = unattendedInstalls);
  ignore pt.addPullValue("num_backend_canisters", "", func() = List.size(List.filter<CanisterData>(canisters, func(c) = c.kind == #backend and Option.isNull(c.deletedAt))));
  ignore pt.addPullValue("num_canisters_rent", "", func() = Queue.size(renters));
  transient var reservationTopups : Nat = 0;
  ignore pt.addPullValue("num_reservation_topups", "", func() = reservationTopups);
  ignore pt.addPullValue("max_canisters_rentals", "", func() = maxRentals);

  public query ({ caller }) func getProfile() : async ?ProfileInfo {
    let ?p = Map.get(profiles, Principal.compare, caller) else return null;
    ?freezeProfile_(p);
  };

  public shared ({ caller }) func updateProfile(arg : { username : ?Text }) : async ProfileInfo {
    let profile = getOrCreateProfile_(caller);
    let updated = switch (arg.username) {
      case (?un) {
        profile.username := ?un;
        true;
      };
      case (null) false;
    };
    if (updated) {
      profile.updatedAt := Prim.time();
    };
    freezeProfile_(profile);
  };

  // deployment examples API
  public query func listDeploymentExamples() : async [DeploymentExample] {
    deploymentExamples
    |> List.values(_)
    |> Iter.toArray(_);
  };

  type DeploymentExampleInput = {
    description : Text;
    kind : { #git : Text; #archive };
    url : Text;
    assets : {
      #pure;
      #build : {
        command : Text;
        envVars : Text;
      };
    };
    assetsDir : Text;
  };

  public shared ({ caller }) func addDeploymentExample(example : DeploymentExampleInput) : async () {
    if (Text.size(example.url) == 0 or Text.size(example.assetsDir) == 0) {
      throw Error.reject("Invalid example: missing required fields");
    };
    List.add(deploymentExamples, { example with owner = ?caller });
  };

  // canisters api
  func addCanisterToStorage_(c : CanisterData) {
    let index = List.size(canisters);
    List.add(canisters, c);

    Map.add(canisterIdMap, Principal.compare, c.canisterId, index);

    for (userId in c.userIds.vals()) {
      let userCanisters = switch (Map.get(userCanistersMap, Principal.compare, userId)) {
        case (?list) list;
        case (null) {
          let list : List.List<Nat> = List.empty();
          Map.add(userCanistersMap, Principal.compare, userId, list);
          list;
        };
      };
      List.add(userCanisters, index);
    };
  };

  func listCanisters_(user : Principal) : [CanisterInfo] {
    let ?userCanisterIndices = Map.get(userCanistersMap, Principal.compare, user) else return [];
    userCanisterIndices
    |> List.values(_)
    |> Iter.map<Nat, CanisterData>(_, func(i) = List.at(canisters, i))
    |> Iter.filter(_, func(c) = Option.isNull(c.deletedAt))
    |> Iter.map<CanisterData, CanisterInfo>(_, freezeCanisterData_)
    |> Iter.toArray(_);
  };

  public query ({ caller }) func listCanisters() : async [CanisterInfo] {
    listCanisters_(caller);
  };

  // Used by the builder (hosty API) to act on behalf of an authenticated user
  public query func listUserCanisters(user : Principal) : async {
    owned : [CanisterInfo];
    rented : ?(CanisterInfo, Nat64);
  } {
    let rented = switch (Map.get(profiles, Principal.compare, user)) {
      case (?p) {
        switch (p.rentedCanister) {
          case (?(idx, ts)) ?(freezeCanisterData_(List.at<CanisterData>(canisters, idx)), ts);
          case (null) null;
        };
      };
      case (null) null;
    };
    { owned = listCanisters_(user); rented };
  };

  public shared ({ caller }) func registerCanister(cid : Principal) : async CanisterInfo {
    let existing = getCanister_(cid);
    switch (existing) {
      case (?(_, d)) {
        if (d.ownedBySystem) {
          throw Error.reject("Cannot register canister: owned by system");
        };
        switch (Array.indexOf(d.userIds, Principal.equal, caller)) {
          case (?_) return freezeCanisterData_(d);
          case (_) {};
        };
      };
      case (null) {};
    };

    let statusProxy : (
      actor {
        loadState : shared (canisterId : Principal) -> async (Nat64, Management.CanisterStatus);
      }
    ) = actor (CONSTANTS.STATUS_PROXY_CID |> Principal.toText(_));

    let (_, status) = await statusProxy.loadState(cid);

    if (
      Option.isNull(Array.indexOf(status.settings.controllers, Principal.equal, caller))
    ) {
      throw Error.reject("Missing required controllers");
    };

    let data = switch (existing) {
      case (?(canisterIndex, canisterData)) {
        canisterData.deletedAt := null;
        canisterData.userIds := Array.concat(canisterData.userIds, [caller]);
        let userCanisters = switch (Map.get(userCanistersMap, Principal.compare, caller)) {
          case (?list) list;
          case (null) {
            let list : List.List<Nat> = List.empty();
            Map.add(userCanistersMap, Principal.compare, caller, list);
            list;
          };
        };
        List.add(userCanisters, canisterIndex);
        canisterData;
      };
      case (null) {
        let canisterData : CanisterData = {
          canisterId = cid;
          var alias = null;
          var description = null;
          var userIds = [caller];
          var frontendUrl = "https://" # Principal.toText(cid) # ".icp0.io/";
          var ownedBySystem = false;
          var kind = #frontend;
          createdAt = Prim.time();
          var deployedAt = null;
          var deletedAt = null;
        };
        addCanisterToStorage_(canisterData);
        canisterData;
      };
    };
    freezeCanisterData_(data);
  };

  public query func getCanister(cid : Principal) : async CanisterInfo {
    let ?(_, data) = getCanister_(cid) else throw Error.reject("Not found");
    if (Option.isSome(data.deletedAt)) {
      throw Error.reject("Not found");
    };
    return freezeCanisterData_(data);
  };

  public shared ({ caller }) func onCanisterDeployed(cid : Principal) : async () {
    if (Option.isNull(Array.indexOf(CONSTANTS.BUILDER_PRINCIPALS, Principal.equal, caller))) {
      throw Error.reject("Permission denied");
    };
    let ?(_, canisterData) = getCanister_(cid) else throw Error.reject("Not found");
    canisterData.deployedAt := ?Prim.time();
  };

  public shared ({ caller }) func updateCanister(cid : Principal, updates : { alias : ??Text; description : ??Text; frontendUrl : ?Text }) : async CanisterInfo {
    let ?(_, canisterData) = getCanister_(cid) else throw Error.reject("Not found");
    switch (Array.indexOf(canisterData.userIds, Principal.equal, caller)) {
      case (null) throw Error.reject("Permission denied");
      case (_) {};
    };
    switch (updates.alias) {
      case (?alias) canisterData.alias := alias;
      case (null) {};
    };
    switch (updates.description) {
      case (?description) canisterData.description := description;
      case (null) {};
    };
    switch (updates.frontendUrl) {
      case (?frontendUrl) canisterData.frontendUrl := frontendUrl;
      case (null) {};
    };
    freezeCanisterData_(canisterData);
  };

  // Switching to #frontend is only allowed while the canister runs the hosty assets
  // module: the web app resets a backend canister first, otherwise the frontend
  // flows (file upload, custom domains) would talk to a module they do not understand.
  func setCanisterKind_(cid : Principal, user : Principal, kind : CanisterKind) : async* CanisterInfo {
    let ?(_, canisterData) = getCanister_(cid) else throw Error.reject("Not found");
    switch (Array.indexOf(canisterData.userIds, Principal.equal, user)) {
      case (null) throw Error.reject("Permission denied");
      case (_) {};
    };
    if (canisterData.kind != kind) {
      if (kind == #frontend) {
        let statusProxy : (
          actor {
            loadState : shared (canisterId : Principal) -> async (Nat64, Management.CanisterStatus);
          }
        ) = actor (CONSTANTS.STATUS_PROXY_CID |> Principal.toText(_));
        let (_, status) = await statusProxy.loadState(cid);
        let runsAssetsModule = switch (status.module_hash) {
          case (?h) Blob.equal(h, assetsModule.0);
          case (null) false;
        };
        if (not runsAssetsModule) {
          throw Error.reject("Canister does not run the hosty assets module. Reset it first");
        };
      };
      canisterData.kind := kind;
    };
    freezeCanisterData_(canisterData);
  };

  public shared ({ caller }) func setCanisterKind(cid : Principal, kind : CanisterKind) : async CanisterInfo {
    await* setCanisterKind_(cid, caller, kind);
  };

  // Used by the builder (hosty API) on behalf of an authenticated user, e.g. on the
  // first backend deployment to a canister.
  public shared ({ caller }) func setCanisterKindFor(user : Principal, cid : Principal, kind : CanisterKind) : async CanisterInfo {
    if (Option.isNull(Array.indexOf(CONSTANTS.BUILDER_PRINCIPALS, Principal.equal, caller))) {
      throw Error.reject("Permission denied");
    };
    await* setCanisterKind_(cid, user, kind);
  };

  // Unattended backend deploys. A user who wants agents to redeploy a backend canister
  // without approving a session each time adds this canister as a controller of that
  // one canister (the analog of the Committer grant on frontends: per canister, revocable
  // by removing the controller, indefinite). The hosty API then installs through these
  // methods. All check that the user owns the target in the registry and that it is a
  // backend canister; controllers are never changed here, so the grant cannot widen.
  func unattendedTarget_(user : Principal, cid : Principal) : CanisterData {
    let ?(_, canisterData) = getCanister_(cid) else Prim.trap("Not found");
    if (Option.isSome(canisterData.deletedAt)) Prim.trap("Not found");
    if (Option.isNull(Array.indexOf(canisterData.userIds, Principal.equal, user))) {
      Prim.trap("Permission denied: canister is not registered to this user");
    };
    if (canisterData.kind != #backend) {
      Prim.trap("Canister is not a backend canister");
    };
    canisterData;
  };

  func assertBuilder_(caller : Principal) {
    if (Option.isNull(Array.indexOf(CONSTANTS.BUILDER_PRINCIPALS, Principal.equal, caller))) {
      Prim.trap("Permission denied");
    };
  };

  public shared ({ caller }) func uploadWasmChunk(user : Principal, cid : Principal, chunk : Blob) : async Management.ChunkHash {
    assertBuilder_(caller);
    ignore unattendedTarget_(user, cid);
    await Management.getActor().upload_chunk({ canister_id = cid; chunk });
  };

  public shared ({ caller }) func clearWasmChunks(user : Principal, cid : Principal) : async () {
    assertBuilder_(caller);
    ignore unattendedTarget_(user, cid);
    await Management.getActor().clear_chunk_store({ canister_id = cid });
  };

  public shared ({ caller }) func installCode(
    user : Principal,
    cid : Principal,
    mode : Management.CanisterInstallMode,
    arg : Blob,
    wasmModuleHash : Blob,
    chunkHashes : [Blob],
  ) : async () {
    assertBuilder_(caller);
    let canisterData = unattendedTarget_(user, cid);
    await Management.getActor().install_chunked_code({
      mode;
      target_canister = cid;
      store_canister = null;
      chunk_hashes_list = Array.map<Blob, Management.ChunkHash>(chunkHashes, func(hash) = { hash });
      wasm_module_hash = wasmModuleHash;
      arg;
      sender_canister_version = null;
    });
    canisterData.deployedAt := ?Prim.time();
    unattendedInstalls += 1;
  };

  // Snapshots on canisters with the unattended grant: the same ownership and kind
  // checks as installCode. A snapshot is taken before an upgrade so a broken
  // post_upgrade can be rolled back; the caller passes the snapshot to replace so a
  // canister keeps at most one hosty snapshot.
  public shared ({ caller }) func takeSnapshot(user : Principal, cid : Principal, replace : ?Blob) : async Management.Snapshot {
    assertBuilder_(caller);
    ignore unattendedTarget_(user, cid);
    await Management.getActor().take_canister_snapshot({ canister_id = cid; replace_snapshot = replace });
  };

  public shared ({ caller }) func listSnapshots(user : Principal, cid : Principal) : async [Management.Snapshot] {
    assertBuilder_(caller);
    ignore unattendedTarget_(user, cid);
    await Management.getActor().list_canister_snapshots({ canister_id = cid });
  };

  public shared ({ caller }) func loadSnapshot(user : Principal, cid : Principal, snapshotId : Blob) : async () {
    assertBuilder_(caller);
    ignore unattendedTarget_(user, cid);
    await Management.getActor().load_canister_snapshot({ canister_id = cid; snapshot_id = snapshotId; sender_canister_version = null });
  };

  public shared ({ caller }) func deleteSnapshot(user : Principal, cid : Principal, snapshotId : Blob) : async () {
    assertBuilder_(caller);
    ignore unattendedTarget_(user, cid);
    await Management.getActor().delete_canister_snapshot({ canister_id = cid; snapshot_id = snapshotId });
  };

  public shared ({ caller }) func deleteCanister(cid : Principal) : async () {
    let ?(_, canisterData) = getCanister_(cid) else throw Error.reject("Not found");
    if (canisterData.ownedBySystem) {
      throw Error.reject("Permission denied");
    };
    switch (Array.indexOf(canisterData.userIds, Principal.equal, caller)) {
      case (null) throw Error.reject("Permission denied");
      case (_) {};
    };
    canisterData.deletedAt := ?Prim.time();
  };

  public shared query ({ caller }) func canRentCanister() : async Bool {
    Queue.size(renters) < maxRentals and not Queue.isEmpty(canistersPool) and Option.isNull(getOrCreateProfile_(caller).rentedCanister);
  };

  // On subnets above the storage reservation threshold (e.g. 3hhby..., ~1.1 TB used)
  // every memory growth reserves cycles: growing by 8 MiB costs around 1T. A pool
  // canister that passed the POOL_CANISTER_CYCLES_THRESHOLD check can therefore
  // still fail install_code, the default page upload or authorize with
  //   "Canister cannot grow memory by 8388608 bytes due to insufficient cycles.
  //    At least 120_250_237_209 additional cycles are required."
  // A fixed higher floor would not help since the reservation grows with the
  // subnet. Instead parse the amount the replica asks for and deposit it.
  private func parseRequiredCycles_(msg : Text) : ?Nat {
    let parts = Iter.toArray(Text.split(msg, #text "additional cycles are required"));
    if (parts.size() < 2) return null;
    let chars = Iter.toArray(Text.toIter(Text.trimEnd(parts[0], #char ' ')));
    var n : Nat = 0;
    var mul : Nat = 1;
    var found = false;
    var i = chars.size();
    label scan while (i > 0) {
      i -= 1;
      let c = chars[i];
      if (c == '_') continue scan;
      if (not Char.isDigit(c)) break scan;
      n += Nat32.toNat(Char.toNat32(c) - Char.toNat32('0')) * mul;
      mul *= 10;
      found := true;
    };
    if (found) ?n else null;
  };

  private func logReservationState_(cid : Principal, when : Text) : async* () {
    try {
      let st = await Management.getActor().canister_status({ canister_id = cid });
      Prim.debugPrint(
        "reservation state " # when # ": cycles=" # debug_show st.cycles
        # " reserved=" # debug_show st.reserved_cycles
        # " memory=" # debug_show st.memory_size
        # " freezing_threshold=" # debug_show st.settings.freezing_threshold
        # " idle_burn_per_day=" # debug_show st.idle_cycles_burned_per_day
      );
    } catch (err) {
      Prim.debugPrint("reservation state " # when # ": status failed: " # Error.message(err));
    };
  };

  // Run a memory-growing step against `cid`. If it is rejected for missing
  // storage reservation cycles, deposit cycles from our own balance and retry.
  //
  // The replica grows memory in 8 MiB chunks, reserves cycles per chunk and
  // reports only the shortfall of the chunk that failed; the trap then rolls
  // the whole message back. The real need can be far larger: the first sync of
  // the assets module grows the canister to ~119 MB, which on the saturated
  // subnet 3hhby... reserved 2.29T in one message (2026-10-15, logs 792-807),
  // while every failure asked for just ~63B. Depositing only what is reported
  // therefore crawls, so the deposit doubles on every attempt. Excess ends up
  // in the target's liquid balance and preparePoolCanister_ takes it back.
  // Any other error, or a failure after the last top-up, propagates.
  private func withReservationTopup_(cid : Principal, step : () -> async* ()) : async* () {
    var attempt = 0;
    var lastAmount = 0;
    loop {
      try {
        return await* step();
      } catch (err) {
        let ?required = parseRequiredCycles_(Error.message(err)) else throw err;
        if (attempt >= CONSTANTS.MAX_RESERVATION_TOPUPS) throw err;
        attempt += 1;
        let amount = Nat.max(required + Nat.max(required / 5, 100_000_000_000), 2 * lastAmount);
        lastAmount := amount;
        Prim.debugPrint("canister " # debug_show cid # " needs " # debug_show required # " more cycles for storage reservation (attempt " # debug_show attempt # ")");
        // Diagnostics: 2026-10-15 five deposits did not move the reported shortfall
        // at all, so record what the target really holds around each deposit.
        await* logReservationState_(cid, "before deposit");
        Prim.debugPrint("topping up canister with " # debug_show amount # " cycles... (own balance " # debug_show Prim.cyclesBalance() # ")");
        reservationTopups += 1;
        await (with cycles = amount) Management.getActor().deposit_cycles({
          canister_id = cid;
        });
        await* logReservationState_(cid, "after deposit");
      };
    };
  };

  // Bring a pool canister to a clean, usable state: sane freezing threshold, enough
  // cycles, the hosty assets module (always (re)installed) and the default page.
  // The canister ends up clean: no user assets, no authorized principals.
  private func installAssetsModule_(cid : Principal, canisterStatus : Management.CanisterStatus) : async* () {
    if (canisterStatus.settings.freezing_threshold != CONSTANTS.POOL_CANISTER_FREEZING_THRESHOLD) {
      Prim.debugPrint("setting freezing threshold...");
      await Management.getActor().update_settings({
        canister_id = cid;
        settings = {
          controllers = null;
          freezing_threshold = ?CONSTANTS.POOL_CANISTER_FREEZING_THRESHOLD;
        };
      });
    };
    if (canisterStatus.cycles < CONSTANTS.POOL_CANISTER_CYCLES_THRESHOLD) {
      Prim.debugPrint("topping up canister...");
      await (with cycles = CONSTANTS.POOL_CANISTER_MIN_CYCLES - canisterStatus.cycles) Management.getActor().deposit_cycles({
        canister_id = cid;
      });
    } else {
      Prim.debugPrint("no need to top up canister");
    };
    Prim.debugPrint("installing module... current wasm hash: " # debug_show canisterStatus.module_hash # "; expected: " # debug_show assetsModule.0);
    await* withReservationTopup_(cid, func() : async* () {
      await Management.getActor().install_code({
        canister_id = cid;
        arg = to_candid (null : ?Assets.InitArgs);
        wasm_module = assetsModule.1;
        mode = switch (canisterStatus.module_hash) {
          case (?_) #reinstall;
          case (null) #install;
        };
        sender_canister_version = null;
      });
    });
    Prim.debugPrint("installing default page...");
    // Safe to retry: the assets canister lets the same owner reclaim its own
    // unfinished sync session, so a second uploadDefaultPage starts over.
    await* withReservationTopup_(cid, func() : async* () {
      await* Assets.uploadDefaultPage(cid);
    });
  };

  // A pool canister prepared before an assets module upgrade still runs the old
  // module; bring it up to date before handing it to a user.
  private func ensureAssetsModule_(cid : Principal) : async* () {
    let canisterStatus = await Management.getActor().canister_status({
      canister_id = cid;
    });
    let isCorrectModule = switch (canisterStatus.module_hash) {
      case (?mod) Blob.equal(mod, assetsModule.0);
      case (null) false;
    };
    if (not isCorrectModule) {
      Prim.debugPrint("pool canister " # debug_show cid # " runs an outdated module, reinstalling");
      await* installAssetsModule_(cid, canisterStatus);
    };
  };

  // Rent setup failed half-way (e.g. the canister ran out of cycles): repair the
  // canister in the background and only then return it to the pool, so the next
  // rent does not hit the same broken canister.
  private func recoverPoolCanister_(cidx : Nat) : async () {
    let cid = List.at(canisters, cidx).canisterId;
    Prim.debugPrint("RECOVERING POOL CANISTER " # debug_show cid # "...");
    try {
      await preparePoolCanister_(cidx);
    } catch (err) {
      Prim.debugPrint("recovery of " # debug_show cid # " failed: " # Error.message(err));
    };
    Queue.pushBack(canistersPool, cidx);
  };

  private func setupUserOwnership_(cid : Principal, user : Principal) : async* () {
    await Management.getActor().update_settings({
      canister_id = cid;
      settings = {
        controllers = ?[CONSTANTS.STATUS_PROXY_CID, Principal.fromActor(self), user];
        freezing_threshold = null;
      };
    });
    // Controllers may always upload; list the user explicitly anyway so access
    // survives controller changes. Builders deploy assets on behalf of users
    // (web UI and AI agents via hosty API).
    let assets = Assets.getAssetActor(cid);
    await* withReservationTopup_(cid, func() : async* () {
      await assets.authorize(user);
    });
    for (builder in CONSTANTS.BUILDER_PRINCIPALS.values()) {
      await* withReservationTopup_(cid, func() : async* () {
        await assets.authorize(builder);
      });
    };
  };

  public shared ({ caller }) func rentCanister() : async R.Result<CanisterInfo, Text> {
    await* rentCanister_(caller);
  };

  // Used by the builder (hosty API) to rent a free canister on behalf of an authenticated user
  public shared ({ caller }) func rentCanisterFor(user : Principal) : async R.Result<CanisterInfo, Text> {
    if (Option.isNull(Array.indexOf(CONSTANTS.BUILDER_PRINCIPALS, Principal.equal, caller))) {
      throw Error.reject("Permission denied");
    };
    await* rentCanister_(user);
  };

  func rentCanister_(caller : Principal) : async* R.Result<CanisterInfo, Text> {
    let profile = getOrCreateProfile_(caller);
    switch (profile.rentedCanister) {
      case (?_) return #err("Free canister already rented");
      case (null) {};
    };
    if (Queue.size(renters) >= maxRentals) {
      return #err("Cannot rent canister right now. Try again later");
    };
    let ?cidx = Queue.popFront(canistersPool) else return #err("Canisters pool is empty");
    let cid = List.at(canisters, cidx).canisterId;

    try {
      await* ensureAssetsModule_(cid);
      await* setupUserOwnership_(cid, caller);
    } catch (err) {
      let _ = recoverPoolCanister_(cidx);
      return #err(Error.message(err));
    };

    profile.rentedCanister := ?(cidx, Prim.time() + CONSTANTS.CANISTER_RENT_PERIOD);
    Queue.pushBack(renters, caller);

    let newCanisterData : CanisterData = {
      canisterId = cid;
      var alias = null;
      var description = null;
      var userIds = [caller];
      var frontendUrl = "https://" # Principal.toText(cid) # ".icp0.io/";
      var ownedBySystem = true;
      var kind = #frontend;
      createdAt = Prim.time();
      var deployedAt = null;
      var deletedAt = null;
    };
    List.put(canisters, cidx, newCanisterData);

    #ok(freezeCanisterData_(newCanisterData));
  };

  private func setupSystemOwnership_(cidx : Nat) : async* () {
    let canisterData = List.at(canisters, cidx);
    let cid = canisterData.canisterId;
    Prim.debugPrint("updating canister controllers...");
    try {
      await Management.getActor().update_settings({
        canister_id = cid;
        settings = {
          controllers = ?[CONSTANTS.STATUS_PROXY_CID, Principal.fromActor(self)];
          freezing_threshold = null;
        };
      });
    } catch (err) {
      throw Error.reject("Cannot update controllers of the canister: " # Error.message(err));
    };

    Prim.debugPrint("updating internal registry state...");
    for (user in canisterData.userIds.values()) {
      switch (Map.get(userCanistersMap, Principal.compare, user)) {
        case (?userCanisters) {
          Map.add(userCanistersMap, Principal.compare, user, List.filter(userCanisters, func(idx) = idx != cidx));
        };
        case (null) {};
      };
    };
    canisterData.userIds := [];
    canisterData.kind := #frontend;
    Queue.pushBack(canistersPool, cidx);
  };

  private func preparePoolCanister_(cidx : Nat) : async () {
    let canisterData = List.at(canisters, cidx);
    let cid = canisterData.canisterId;
    Prim.debugPrint("loading canister status...");
    let canisterStatus = await Management.getActor().canister_status({
      canister_id = cid;
    });
    // Always reinstall: a canister returning to the pool must be clean (no user
    // assets, no authorized principals, no stale module). Data in it is not important.
    await* installAssetsModule_(cid, canisterStatus);

    // Reload: the install may have deposited cycles (reservation top-ups) and the
    // first sync may have moved a large part of the balance into reserved cycles,
    // which `cycles` no longer includes. Deciding on the pre-install status asked
    // hfbth... to send out 0.93T of a 0.3T liquid balance (2026-10-15, log 808).
    let afterInstall = await Management.getActor().canister_status({
      canister_id = cid;
    });
    if (afterInstall.cycles > CONSTANTS.POOL_CANISTER_MIN_CYCLES) {
      Prim.debugPrint("taking cycles out...");
      let resp = await Assets.getAssetActor(cid).wallet_send({
        amount = Nat64.fromIntWrap(afterInstall.cycles - CONSTANTS.POOL_CANISTER_MIN_CYCLES);
        canister = Principal.fromActor(self);
      });
      Prim.debugPrint("cycles take out response: " # debug_show resp);
    } else {
      Prim.debugPrint("no cycles to take out");
    };
  };

  public shared ({ caller }) func donateCanister(cid : Principal) : async R.Result<(), Text> {
    let ?cidx = Map.get(canisterIdMap, Principal.compare, cid) else return #err("No canister with such id");
    let canisterData = List.at(canisters, cidx);
    if (canisterData.ownedBySystem) {
      return #err("Permission denied");
    };
    switch (Array.indexOf(canisterData.userIds, Principal.equal, caller)) {
      case (null) return #err("Permission denied");
      case (?_) {};
    };
    Prim.debugPrint("DONATING CANISTER " # (debug_show cid) # "...");
    await* setupSystemOwnership_(cidx);
    canisterData.ownedBySystem := true;
    let _ = preparePoolCanister_(cidx);
    #ok();
  };

  transient let takeRentedCanistersBackSchedule = Scheduler.Scheduler(
    CONSTANTS.RENT_TAKEBACK_INTERVAL,
    0,
    func(_ : Nat) : async* () {
      label l while (true) {
        let ?renter = Queue.popFront(renters) else return;
        let ?profile = Map.get(profiles, Principal.compare, renter) else continue l;
        let ?(cidx, rentUntil) = profile.rentedCanister else continue l;
        if (rentUntil > Prim.time()) {
          Queue.pushFront(renters, renter);
          return;
        } else {
          Prim.debugPrint("RETURNING BACK CANISTER " # Principal.toText(List.at(canisters, cidx).canisterId) # "...");
          try {
            await* setupSystemOwnership_(cidx);
          } catch (err) {
            Prim.debugPrint("Cannot take the canister " # Principal.toText(List.at(canisters, cidx).canisterId) # " back: " # Error.message(err));
            Queue.pushBack(renters, renter);
            continue l;
          };
          profile.rentedCanister := null;
          try {
            await preparePoolCanister_(cidx);
          } catch (err) {
            Prim.debugPrint("Could not prepare canister for pool: " # Error.message(err));
          };
        };
      };
    },
  );
  takeRentedCanistersBackSchedule.start<system>();

  public query func http_request(req : Http.Request) : async Http.Response {
    let ?path = Text.split(req.url, #char '?').next() else return Http.render400();
    let labels = "canister=\"" # PT.shortName(self) # "\"";
    switch (req.method, path) {
      case ("GET", "/metrics") {
        Http.renderPlainText(pt.renderExposition(labels));
      };
      case (_) Http.render400();
    };
  };

  public shared ({ caller }) func setAssetsModule(hash : Blob, wasm : Blob) : async () {
    if (not Principal.isController(caller)) {
      throw Error.reject("Permission denied");
    };
    assetsModule := (hash, wasm);
  };

  // Recovery tool: re-prepare every canister currently in the pool (freezing
  // threshold, cycles, module, default page), one after another in the background.
  // Returns the number of canisters scheduled.
  public shared ({ caller }) func preparePoolCanisters() : async Nat {
    if (not Principal.isController(caller)) {
      throw Error.reject("Permission denied");
    };
    let pool = Iter.toArray(Queue.values(canistersPool));
    let _ = preparePoolCanistersSequentially_(pool);
    pool.size();
  };

  private func preparePoolCanistersSequentially_(pool : [Nat]) : async () {
    for (cidx in pool.values()) {
      try {
        await preparePoolCanister_(cidx);
      } catch (err) {
        Prim.debugPrint("preparing pool canister " # debug_show (List.at(canisters, cidx).canisterId) # " failed: " # Error.message(err));
      };
    };
  };

  public shared ({ caller }) func setMaxRentals(v : Nat) : async () {
    if (not Principal.isController(caller)) {
      throw Error.reject("Permission denied");
    };
    maxRentals := v;
  };

  public shared ({ caller }) func restartScheduler() : async () {
    if (not Principal.isController(caller)) {
      throw Error.reject("Permission denied");
    };
    takeRentedCanistersBackSchedule.stop();
    takeRentedCanistersBackSchedule.start<system>();
  };

  public shared ({ caller }) func undoDonation(cid : Principal, userId : Principal) : async () {
    if (not Principal.isController(caller)) {
      throw Error.reject("Permission denied");
    };
    if (not Map.containsKey(profiles, Principal.compare, userId)) {
      throw Error.reject("User profile not found");
    };
    let ?cidx = Map.get(canisterIdMap, Principal.compare, cid) else throw Error.reject("Unknown canister id");
    let canisterData = List.at(canisters, cidx);

    if (not canisterData.ownedBySystem) {
      throw Error.reject("Canister is not owned by system");
    };
    if (not Queue.contains(canistersPool, Nat.equal, cidx)) {
      throw Error.reject("Canister is already rented by someone. Try again later");
    };

    canistersPool := Queue.filter(canistersPool, func(idx) = idx != cidx);
    try {
      await* setupUserOwnership_(cid, userId);
    } catch (err) {
      Queue.pushBack(canistersPool, cidx);
      throw err;
    };
    canisterData.ownedBySystem := false;
    canisterData.userIds := [userId];
    let userCanisters = switch (Map.get(userCanistersMap, Principal.compare, userId)) {
      case (?list) list;
      case (null) {
        let list : List.List<Nat> = List.empty();
        Map.add(userCanistersMap, Principal.compare, userId, list);
        list;
      };
    };
    List.add(userCanisters, cidx);
  };

};
