import Array "mo:core/Array";
import Error "mo:core/Error";
import Map "mo:core/pure/Map";
import Prim "mo:prim";
import Principal "mo:core/Principal";

import Management "../shared/management";
// import Scheduler "../shared/scheduler";

shared persistent actor class StatusProxy() = self {

  var cache : Map.Map<Principal, (Nat64, Management.CanisterStatus)> = Map.empty();
  var debugImmutables : Map.Map<Principal, { controllers : [Principal] }> = Map.empty();
  var immutableCanistersAmount : Nat = 0;

  transient let ic = Management.getActor();

  transient let CONSTANTS = {
    CACHE_TTL = 60 : Nat64; // temporarily use 1 minute cache TTL

    // CACHE_TTL = 21_600 : Nat64; // do not reload state if cache is younger than 6 hours
    // CACHE_KEEP_TTL = 86_400 : Nat64; // do not remove canister id from cache for 24 hours after last update
    // CLEANUP_INTERVAL = 86_400 : Nat64; // cleanup each 24 hours
    // CLEANUP_INTERVAL_BIAS = 0 : Nat64; // bias 0 for 24h interval means "at UTC midnight"
  };

  public shared query func queryState(canisterId : Principal) : async ?(Nat64, Management.CanisterStatus) {
    Map.get(cache, Principal.compare, canisterId);
  };

  public shared func loadState(canisterId : Principal) : async (Nat64, Management.CanisterStatus) {
    let now = Prim.time() / 1_000_000_000;
    switch (Map.get(cache, Principal.compare, canisterId)) {
      case (?(cacheTS, data)) if (cacheTS + CONSTANTS.CACHE_TTL > now) {
        return (cacheTS, data);
      };
      case (null) {};
    };
    let statusResponse = await ic.canister_status({ canister_id = canisterId });
    cache := Map.add(cache, Principal.compare, canisterId, (now, statusResponse));
    (now, statusResponse);
  };

  public shared ({ caller }) func invalidateCache(canisterId : Principal) : async Bool {
    switch (Map.get(cache, Principal.compare, canisterId)) {
      case (?(_, data)) switch (Array.indexOf(data.settings.controllers, Principal.equal, caller)) {
        case (?_) {
          let (upd, _) = Map.delete<Principal, (Nat64, Management.CanisterStatus)>(cache, Principal.compare, canisterId);
          cache := upd;
          true;
        };
        case (null) false;
      };
      case (null) false;
    };
  };

  public shared query func isImmutableInDebugMode(canisterId : Principal) : async ?[Principal] {
    switch (Map.get(debugImmutables, Principal.compare, canisterId)) {
      case (?{ controllers }) ?controllers;
      case (null) null;
    };
  };

  public shared query func stats() : async ({
    immutable : Nat;
    immutableInDebugMode : Nat;
  }) = async ({
    immutable = immutableCanistersAmount;
    immutableInDebugMode = Map.size(debugImmutables);
  });

  public shared ({ caller }) func makeImmutable(canisterId : Principal, debugMode : Bool) : async () {
    if (Map.containsKey(debugImmutables, Principal.compare, canisterId)) {
      throw Error.reject("Already immutable");
    };
    let state = try {
      await? ic.canister_status({ canister_id = canisterId });
    } catch (err) {
      throw Error.reject("Error while fetching canister status: " # Error.message(err));
    };
    if (state.settings.controllers.size() == 1) {
      throw Error.reject("Already immutable");
    };
    switch (Array.indexOf(state.settings.controllers, Principal.equal, caller)) {
      case (null) throw Error.reject("Permission denied");
      case (_) {};
    };

    let selfP = Principal.fromActor(self);
    try {
      await? ic.update_settings({
        canister_id = canisterId;
        settings = { controllers = ?[selfP] };
      });
    } catch (err) {
      throw Error.reject("Error while updating canister settings: " # Error.message(err));
    };
    if (debugMode) {
      debugImmutables := Map.add(
        debugImmutables,
        Principal.compare,
        canisterId,
        {
          controllers = Array.filter<Principal>(state.settings.controllers, func(p) = not Principal.equal(p, selfP));
        },
      );
    } else {
      immutableCanistersAmount += 1;
    };
    // try to remove all permissions in the asset canister
    try {
      let assetActor : (
        actor {
          take_ownership : shared () -> async ();
        }
      ) = actor (Principal.toText(canisterId));
      ignore assetActor.take_ownership();
    } catch (_) {
      //pass
    };
  };

  public shared ({ caller }) func undoImmutability(canisterId : Principal) : async () {
    switch (Map.get(debugImmutables, Principal.compare, canisterId)) {
      case (null) throw Error.reject("Not immutable in debug mode");
      case (?{ controllers }) {
        switch (Array.indexOf(controllers, Principal.equal, caller)) {
          case (null) throw Error.reject("Caller is not in the controllers list");
          case (_) {};
        };
        try {
          await? ic.update_settings({
            canister_id = canisterId;
            settings = {
              controllers = ?Array.flatten([controllers, [Principal.fromActor(self)]]);
            };
          });
        } catch (err) {
          throw Error.reject("Error while updating canister status: " # Error.message(err));
        };
        debugImmutables := Map.remove(debugImmutables, Principal.compare, canisterId);
        // try to add commit permissions in the asset canister
        try {
          let assetActor : (
            actor {
              grant_permission : shared ({
                permission : { #Prepare; #ManagePermissions; #Commit };
                to_principal : Principal;
              }) -> async ();
            }
          ) = actor (Principal.toText(canisterId));
          for (p in controllers.vals()) {
            ignore assetActor.grant_permission({
              permission = #Commit;
              to_principal = p;
            });
          };
        } catch (_) {
          //pass
        };
      };
    };
  };

  // transient let cleanupSchedule = Scheduler.Scheduler(
  //   CONSTANTS.CLEANUP_INTERVAL,
  //   CONSTANTS.CLEANUP_INTERVAL_BIAS,
  //   func(_ : Nat) : async* () {
  //     let now = Prim.time() / 1_000_000_000;
  //     cache := Map.filter(
  //       cache,
  //       Principal.compare,
  //       func(_ : Principal, (ts : Nat64, _ : CanisterStatus)) : Bool = ts + CONSTANTS.CACHE_KEEP_TTL > now,
  //     );
  //   },
  // );

  // cleanupSchedule.start<system>();

  // public shared func restartCleanupScheduleTimer() : async () {
  //   // restart timer only if timer did not run for 48 hours straight
  //   if (cleanupSchedule.lastExecutionTimestamp() + 172_800_000_000_000 < Prim.time()) {
  //     cleanupSchedule.stop();
  //     cleanupSchedule.start<system>();
  //   };
  // };

};
