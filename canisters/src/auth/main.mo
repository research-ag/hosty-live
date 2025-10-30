import Map "mo:core/pure/Map";
import Prim "mo:prim";
import Principal "mo:core/Principal";

import Scheduler "../shared/scheduler";

persistent actor class Auth() {

  system func inspect({
    arg : Blob;
    msg : {
      #checkChallenge : () -> (principal : Principal);
      #submitChallenge : () -> (payload : Blob);
    };
  }) : Bool {
    // spam protection
    if (arg.size() > 1024) return false;

    switch (msg) {
      case (#submitChallenge argFunc) argFunc().size() == 32;
      case (_) true;
    };
  };

  var storage : Map.Map<Principal, (Nat64, Blob)> = Map.empty();

  public shared ({ caller }) func submitChallenge(payload : Blob) : async () {
    assert payload.size() == 32;
    storage := Map.add(storage, Principal.compare, caller, (Prim.time() / 1_000_000, payload));
  };

  public shared query func checkChallenge(principal : Principal) : async ?(Nat64, Blob) {
    Map.get(storage, Principal.compare, principal);
  };

  transient let cleanupSchedule = Scheduler.Scheduler(
    86_400,
    0,
    func(_ : Nat) : async* () {
      let minTimestamp = (Prim.time() / 1_000_000) - 300_000; // 5 minutes ago
      storage := Map.filter(
        storage,
        Principal.compare,
        func(_ : Principal, (ts : Nat64, _ : Blob)) : Bool = ts > minTimestamp,
      );
    },
  );
  cleanupSchedule.start<system>();

};
