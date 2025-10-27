import Array "mo:core/Array";
import Error "mo:core/Error";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Option "mo:core/Option";
import Prim "mo:prim";
import Principal "mo:core/Principal";

import Management "../shared/management";

persistent actor class Backend() {

  let CONSTANTS = {
    STATUS_PROXY_CID = Principal.fromText("3jolg-2yaaa-aaaao-a4p3a-cai");
  };

  type CanisterData = {
    var deletedAt : ?Nat64;
    createdAt : Nat64;
    var frontendUrl : Text;
  };

  type CanisterInfo = {
    canisterId : Principal;
    userId : Principal;
    createdAt : Nat64;
    deletedAt : ?Nat64;
    frontendUrl : Text;
  };

  type PublicCanisterInfo = {
    canisterId : Principal;
    createdAt : Nat64;
    deletedAt : ?Nat64;
    frontendUrl : Text;
  };

  let canisters : Map.Map<Principal, Map.Map<Principal, CanisterData>> = Map.empty();
  func _getCanisterData(cid : Principal, owner : Principal) : ?CanisterData {
    let ?userCanisters = Map.get(canisters, Principal.compare, owner) else return null;
    Map.get(userCanisters, Principal.compare, cid);
  };

  // canisters api
  public query ({ caller }) func listCanisters() : async [CanisterInfo] {
    let ?userCanisters = Map.get(canisters, Principal.compare, caller) else return [];
    userCanisters
    |> Map.entries(_)
    // |> Iter.filter(_, func(_, c) = Option.isNull(c.deletedAt))
    |> Iter.map<(Principal, CanisterData), CanisterInfo>(
      _,
      func(canisterId, d) = {
        createdAt = d.createdAt;
        deletedAt = d.deletedAt;
        frontendUrl = d.frontendUrl;
        canisterId;
        userId = caller;
      },
    )
    |> Iter.toArray(_);
  };

  public shared ({ caller }) func registerCanister(cid : Principal) : async CanisterInfo {

    let userCanisters = switch (Map.get(canisters, Principal.compare, caller)) {
      case (?map) {
        if (Map.containsKey(map, Principal.compare, cid)) {
          throw Error.reject("Already registered");
        };
        map;
      };
      case (null) {
        let map : Map.Map<Principal, CanisterData> = Map.empty();
        Map.add(canisters, Principal.compare, caller, map);
        map;
      };
    };

    let status = await Management.getActor().canister_status({
      canister_id = cid;
    });
    if (
      Option.isNull(Array.indexOf(status.settings.controllers, Principal.equal, caller)) or
      Option.isNull(Array.indexOf(status.settings.controllers, Principal.equal, CONSTANTS.STATUS_PROXY_CID))
    ) {
      throw Error.reject("Missing required controllers");
    };

    let canisterData : CanisterData = {
      var deletedAt = null;
      createdAt = Prim.time();
      var frontendUrl = "https://" # Principal.toText(cid) # ".icp0.io/";
    };
    Map.add(userCanisters, Principal.compare, cid, canisterData);

    {
      createdAt = canisterData.createdAt;
      deletedAt = canisterData.deletedAt;
      frontendUrl = canisterData.frontendUrl;
      canisterId = cid;
      userId = caller;
    };
  };

  public query ({ caller }) func getCanister(cid : Principal) : async CanisterInfo {
    let ?data = _getCanisterData(cid, caller) else throw Error.reject("Not found");
    return {
      createdAt = data.createdAt;
      deletedAt = data.deletedAt;
      frontendUrl = data.frontendUrl;
      canisterId = cid;
      userId = caller;
    };
  };

  public query ({ caller }) func getPublicCanister(cid : Principal) : async PublicCanisterInfo {
    let ?data = _getCanisterData(cid, caller) else throw Error.reject("Not found");
    return {
      createdAt = data.createdAt;
      deletedAt = data.deletedAt;
      frontendUrl = data.frontendUrl;
      canisterId = cid;
    };
  };

  public shared ({ caller }) func deleteCanister(cid : Principal) : async () {
    let userCanisters = switch (Map.get(canisters, Principal.compare, caller)) {
      case (?map) map;
      case (null) throw Error.reject("Not found");
    };
    let ?canisterData = Map.get(userCanisters, Principal.compare, cid) else throw Error.reject("Not found");
    canisterData.deletedAt := ?Prim.time();
  };

};
