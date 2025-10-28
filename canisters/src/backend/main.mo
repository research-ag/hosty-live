import Array "mo:core/Array";
import Error "mo:core/Error";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import Option "mo:core/Option";
import Prim "mo:prim";
import Principal "mo:core/Principal";

import Management "../shared/management";


persistent actor class Backend() {

  transient let CONSTANTS = {
    STATUS_PROXY_CID = Principal.fromText("3jolg-2yaaa-aaaao-a4p3a-cai");
    BACKEND_PRINCIPAL = Principal.fromText("i2qrn-wou4z-zo3z2-g6vlg-dma7w-siosb-tfkdt-gw2ut-s2tmr-66dzg-fae");
  };

  type CanisterData = {
    userId : Principal;
    canisterId : Principal;
    createdAt : Nat64;
    var updatedAt : Nat64;
    var deletedAt : ?Nat64;
    var frontendUrl : Text;
  };

  type CanisterInfo = {
    userId : Principal;
    canisterId : Principal;
    createdAt : Nat64;
    updatedAt : Nat64;
    deletedAt : ?Nat64;
    frontendUrl : Text;
  };

  let canisters : List.List<CanisterData> = List.empty();
  let userCanistersMap : Map.Map<Principal, List.List<Nat>> = Map.empty();
  let canisterIdMap : Map.Map<Principal, Nat> = Map.empty();

  func freezeCanisterData_(cd : CanisterData) : CanisterInfo = {
    userId = cd.userId;
    canisterId = cd.canisterId;
    createdAt = cd.createdAt;
    updatedAt = cd.updatedAt;
    deletedAt = cd.deletedAt;
    frontendUrl = cd.frontendUrl;
  };

  func getCanisterData_(cid : Principal) : ?CanisterData {
    let ?index = Map.get(canisterIdMap, Principal.compare, cid) else return null;
    ?List.at<CanisterData>(canisters, index);
  };

  // canisters api
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

    if (Option.isSome(getCanisterData_(cid))) {
      throw Error.reject("Already registered");
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

    let canisterData : CanisterData = {
      userId = caller;
      canisterId = cid;
      createdAt = Prim.time();
      var updatedAt = Prim.time();
      var deletedAt = null;
      var frontendUrl = "https://" # Principal.toText(cid) # ".icp0.io/";
    };
    let index = List.size(canisters);
    List.add(canisters, canisterData);

    Map.add(canisterIdMap, Principal.compare, cid, index);

    let userCanisters = switch (Map.get(userCanistersMap, Principal.compare, caller)) {
      case (?list) list;
      case (null) {
        let list : List.List<Nat> = List.empty();
        Map.add(userCanistersMap, Principal.compare, caller, list);
        list;
      };
    };
    List.add(userCanisters, index);
    freezeCanisterData_(canisterData);
  };

  public query func getCanister(cid : Principal) : async CanisterInfo {
    let ?data = getCanisterData_(cid) else throw Error.reject("Not found");
    return freezeCanisterData_(data);
  };

  public shared ({ caller }) func updateTimestamp(cid : Principal) : async () {
    if (caller != CONSTANTS.BACKEND_PRINCIPAL) {
      throw Error.reject("Permission denied");
    };
    let ?canisterData = getCanisterData_(cid) else throw Error.reject("Not found");
    canisterData.updatedAt := Prim.time();
  };

  public shared ({ caller }) func deleteCanister(cid : Principal) : async () {
    let ?canisterData = getCanisterData_(cid) else throw Error.reject("Not found");
    if (canisterData.userId != caller) {
      throw Error.reject("Permission denied");
    };
    canisterData.deletedAt := ?Prim.time();
  };

};
