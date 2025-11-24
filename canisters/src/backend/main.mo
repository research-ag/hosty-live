import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Error "mo:core/Error";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
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
  };

  type CanisterData = {
    canisterId : Principal;
    var alias : ?Text;
    var description : ?Text;
    var userIds : [Principal];
    var frontendUrl : Text;
    var ownedBySystem : Bool;
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
  ignore pt.addPullValue("num_canisters_rent", "", func() = Queue.size(renters));
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

  public query ({ caller }) func listCanisters() : async [CanisterInfo] {
    let ?userCanisterIndices = Map.get(userCanistersMap, Principal.compare, caller) else return [];
    userCanisterIndices
    |> List.values(_)
    |> Iter.map<Nat, CanisterData>(_, func(i) = List.at(canisters, i))
    // |> Iter.filter(_, func(_, c) = Option.isNull(c.deletedAt))
    |> Iter.map<CanisterData, CanisterInfo>(_, freezeCanisterData_)
    |> Iter.toArray(_);
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

  private func setupUserOwnership_(cid : Principal, user : Principal) : async* () {
    let futures : List.List<async ()> = List.empty();
    List.add(
      futures,
      Management.getActor().update_settings({
        canister_id = cid;
        settings = {
          controllers = ?[CONSTANTS.STATUS_PROXY_CID, Principal.fromActor(self), user];
        };
      }),
    );
    List.add(
      futures,
      Assets.getAssetActor(cid).grant_permission({
        permission = #Prepare;
        to_principal = user;
      }),
    );
    List.add(
      futures,
      Assets.getAssetActor(cid).grant_permission({
        permission = #Commit;
        to_principal = user;
      }),
    );
    for (bp in CONSTANTS.BUILDER_PRINCIPALS.values()) {
      List.add(
        futures,
        Assets.getAssetActor(cid).grant_permission({
          permission = #Commit;
          to_principal = bp;
        }),
      );
    };
    for (f in List.values(futures)) {
      await f;
    };
  };

  public shared ({ caller }) func rentCanister() : async R.Result<CanisterInfo, Text> {
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
      await* setupUserOwnership_(cid, caller);
    } catch (err) {
      Queue.pushBack(canistersPool, cidx);
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
        };
      });
    } catch (err) {
      throw Error.reject("Cannot update controllers of the canister: " # Error.message(err));
    };

    Prim.debugPrint("updating internal registry state...");
    for (user in canisterData.userIds.values()) {
      let ?userCanisters = Map.get(userCanistersMap, Principal.compare, user) else Prim.trap("No user canisters list");
      Map.add(userCanistersMap, Principal.compare, user, List.filter(userCanisters, func(idx) = idx != cidx));
    };
    canisterData.userIds := [];
    Queue.pushBack(canistersPool, cidx);
  };

  private func preparePoolCanister_(cidx : Nat) : async () {
    let canisterData = List.at(canisters, cidx);
    let cid = canisterData.canisterId;
    Prim.debugPrint("loading canister status...");
    let canisterStatus = await Management.getActor().canister_status({
      canister_id = cid;
    });
    if (canisterStatus.cycles < CONSTANTS.POOL_CANISTER_CYCLES_THRESHOLD) {
      Prim.debugPrint("topping up canister...");
      await (with cycles = CONSTANTS.POOL_CANISTER_MIN_CYCLES - canisterStatus.cycles) Management.getActor().deposit_cycles({
        canister_id = cid;
      });
    } else {
      Prim.debugPrint("no need to top up canister");
    };

    let isCorrectModule = switch (canisterStatus.module_hash) {
      case (?mod) Blob.equal(mod, assetsModule.0);
      case (null) false;
    };
    Prim.debugPrint("Is correct module? " # debug_show isCorrectModule # "; canister wasm hash: " # debug_show canisterStatus.module_hash);
    if (not isCorrectModule) {
      Prim.debugPrint("installing module...");
      let arg = to_candid ({
        Init = {
          set_permissions = ?{
            prepare = [Principal.fromActor(self)];
            commit = [Principal.fromActor(self)];
            manage_permissions = [Principal.fromActor(self)];
          };
        };
      });
      await Management.getActor().install_code({
        canister_id = cid;
        arg;
        wasm_module = assetsModule.1;
        mode = switch (canisterStatus.module_hash) {
          case (?_) #reinstall;
          case (null) #install;
        };
        sender_canister_version = null;
      });
    } else {
      await Assets.getAssetActor(cid).take_ownership();
    };

    Prim.debugPrint("installing default page...");
    await Assets.getAssetActor(cid).store({
      key = "/index.html";
      content = Assets.getDefaultPage(cid) |> Text.encodeUtf8(_) |> Blob.toArray(_);
      sha256 = null;
      content_type = "text/html";
      content_encoding = "identity";
    });

    if (canisterStatus.cycles > CONSTANTS.POOL_CANISTER_MIN_CYCLES) {
      Prim.debugPrint("taking cycles out...");
      let resp = await Assets.getAssetActor(cid).wallet_send({
        amount = Nat64.fromIntWrap(canisterStatus.cycles - CONSTANTS.POOL_CANISTER_MIN_CYCLES);
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
      while (true) {
        let ?renter = Queue.peekFront(renters) else return;
        let ?profile = Map.get(profiles, Principal.compare, renter) else {
          ignore Queue.popFront(renters);
          return;
        };
        let ?(cidx, rentUntil) = profile.rentedCanister else {
          ignore Queue.popFront(renters);
          return;
        };
        if (rentUntil < Prim.time()) {
          ignore Queue.popFront(renters);

          Prim.debugPrint("RETURNING BACK CANISTER " # Principal.toText(List.at(canisters, cidx).canisterId) # "...");
          try {
            await* setupSystemOwnership_(cidx);
          } catch (err) {
            Prim.debugPrint("Cannot take the canister " # Principal.toText(List.at(canisters, cidx).canisterId) # " back: " # Error.message(err));
            Queue.pushBack(renters, renter);
          };
          profile.rentedCanister := null;
          try {
            await preparePoolCanister_(cidx);
          } catch (err) {
            Prim.debugPrint("Could not prepare canister for pool: " # Error.message(err));
          };
        } else {
          return;
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
