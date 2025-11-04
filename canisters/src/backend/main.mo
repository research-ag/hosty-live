import Array "mo:core/Array";
import Error "mo:core/Error";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import Option "mo:core/Option";
import Prim "mo:prim";
import Principal "mo:core/Principal";
import R "mo:core/Result";

import Management "../shared/management";

persistent actor class Backend() {

  transient let CONSTANTS = {
    STATUS_PROXY_CID = Principal.fromText("3jolg-2yaaa-aaaao-a4p3a-cai");
    BUILDER_PRINCIPALS : [Principal] = [
      Principal.fromText("i2qrn-wou4z-zo3z2-g6vlg-dma7w-siosb-tfkdt-gw2ut-s2tmr-66dzg-fae")
    ];
    BACKEND_PRINCIPAL = Principal.fromText("i2qrn-wou4z-zo3z2-g6vlg-dma7w-siosb-tfkdt-gw2ut-s2tmr-66dzg-fae");
  };

  type CanisterData = {
    var userIds : [Principal];
    canisterId : Principal;
    var frontendUrl : Text;
    createdAt : Nat64;
    var updatedAt : Nat64;
    var deletedAt : ?Nat64;
  };

  type Profile = {
    userId : Principal;
    var username : ?Text;
    var freeCanisterClaimedAt : ?Nat64;
    createdAt : Nat64;
    var updatedAt : Nat64;
  };

  let profiles : Map.Map<Principal, Profile> = Map.empty();

  let canisters : List.List<CanisterData> = List.empty();
  let userCanistersMap : Map.Map<Principal, List.List<Nat>> = Map.empty();
  let canisterIdMap : Map.Map<Principal, Nat> = Map.empty();

  type ProfileInfo = {
    userId : Principal;
    username : ?Text;
    freeCanisterClaimedAt : ?Nat64;
    createdAt : Nat64;
    updatedAt : Nat64;
  };
  func freezeProfile_(cd : Profile) : ProfileInfo = {
    userId = cd.userId;
    username = cd.username;
    freeCanisterClaimedAt = cd.freeCanisterClaimedAt;
    createdAt = cd.createdAt;
    updatedAt = cd.updatedAt;
  };

  type CanisterInfo = {
    userIds : [Principal];
    canisterId : Principal;
    createdAt : Nat64;
    updatedAt : Nat64;
    deletedAt : ?Nat64;
    frontendUrl : Text;
  };
  func freezeCanisterData_(cd : CanisterData) : CanisterInfo = {
    userIds = cd.userIds;
    canisterId = cd.canisterId;
    createdAt = cd.createdAt;
    updatedAt = cd.updatedAt;
    deletedAt = cd.deletedAt;
    frontendUrl = cd.frontendUrl;
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
        let profile = {
          userId = p;
          var username : ?Text = null;
          var freeCanisterClaimedAt : ?Nat64 = null;
          createdAt = Prim.time();
          var updatedAt = Prim.time();
        };
        Map.add<Principal, Profile>(profiles, Principal.compare, p, profile);
        profile;
      };
    };
  };

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
          var userIds = [caller];
          canisterId = cid;
          createdAt = Prim.time();
          var updatedAt = Prim.time();
          var deletedAt = null;
          var frontendUrl = "https://" # Principal.toText(cid) # ".icp0.io/";
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
    canisterData.updatedAt := Prim.time();
  };

  public shared ({ caller }) func updateCanisterFrontendUrl(cid : Principal, frontendUrl : Text) : async CanisterInfo {
    let ?(_, canisterData) = getCanister_(cid) else throw Error.reject("Not found");
    if (not Principal.equal(caller, CONSTANTS.BACKEND_PRINCIPAL)) {
      switch (Array.indexOf(canisterData.userIds, Principal.equal, caller)) {
        case (null) throw Error.reject("Permission denied");
        case (_) {};
      };
    };
    canisterData.frontendUrl := frontendUrl;
    canisterData.updatedAt := Prim.time();
    freezeCanisterData_(canisterData);
  };

  public shared ({ caller }) func deleteCanister(cid : Principal) : async () {
    let ?(_, canisterData) = getCanister_(cid) else throw Error.reject("Not found");
    switch (Array.indexOf(canisterData.userIds, Principal.equal, caller)) {
      case (null) throw Error.reject("Permission denied");
      case (_) {};
    };
    canisterData.deletedAt := ?Prim.time();
  };

  public shared ({ caller }) func claimFreeCanister() : async R.Result<CanisterInfo, Text> {
    let profile = getOrCreateProfile_(caller);
    switch (profile.freeCanisterClaimedAt) {
      case (?_) return #err("Free canister already claimed");
      case (null) {};
    };
    try {
      let { canister_id } = await (with cycles = 840_000_000_000) Management.getActor().create_canister({
        settings = ?{
          compute_allocation = null;
          freezing_threshold = null;
          log_visibility = null;
          memory_allocation = null;
          controllers = ?[CONSTANTS.STATUS_PROXY_CID, caller];
          reserved_cycles_limit = null;
          wasm_memory_limit = null;
        };
        sender_canister_version = null;
      });
      profile.freeCanisterClaimedAt := ?Prim.time();
      let canisterData : CanisterData = {
        var userIds = [caller];
        canisterId = canister_id;
        createdAt = Prim.time();
        var updatedAt = Prim.time();
        var deletedAt = null;
        var frontendUrl = "https://" # Principal.toText(canister_id) # ".icp0.io/";
      };
      addCanisterToStorage_(canisterData);
      #ok(freezeCanisterData_(canisterData));
    } catch (err) {
      #err(Error.message(err));
    };
  };

  // tmp function
  public shared ({ caller }) func submitRegisteredCanisters(canisters : [CanisterInfo]) : () {
    assert Principal.equal(caller, CONSTANTS.BACKEND_PRINCIPAL);
    for (ci in canisters.vals()) {
      switch (getCanister_(ci.canisterId)) {
        case (?(_, data)) {
          data.frontendUrl := ci.frontendUrl;
          data.updatedAt := ci.updatedAt;
          data.deletedAt := ci.deletedAt;
        };
        case (null) {
          addCanisterToStorage_({
            var userIds = ci.userIds;
            canisterId = ci.canisterId;
            var frontendUrl = ci.frontendUrl;
            createdAt = ci.createdAt;
            var updatedAt = ci.updatedAt;
            var deletedAt = ci.deletedAt;
          });
        };
      };
    };
  };

};
