# hosty.live assets canister (fork of dfinity/certified-assets)

This directory is hosty.live's own copy of the DFINITY **certified-assets**
canister, the "static-site" frontend canister that `icp deploy` installs
(`@dfinity/static-site` recipe). It is the wasm that hosty installs on every
user frontend canister, with one hosty-specific addition: controller-only
methods to move cycles out of the canister.

There is no separate GitHub fork any more. The previous hosty asset canister
was a fork of the old `dfinity/sdk` asset canister (`research-ag/sdk`, branch
`hostybot-0.0.1`); that fork is retired and this directory replaces it.

## Where the code comes from

- Upstream: <https://github.com/dfinity/certified-assets>
- Version copied: **v0.4.1**, commit `de7c4843f23f81704973b5891f8f8260eec2461e`
  (released 2026-10-07), Apache-2.0 (see `LICENSE`).

Only what is needed to build and understand the canister was copied:

| Path | Why it is here |
|------|----------------|
| `crates/canister`, `crates/canister-core`, `crates/wire-types`, `crates/state-hash` | The canister itself and its dependencies. |
| `crates/asset-prep`, `crates/sync-core`, `crates/state-hash-cli` | Not compiled into the canister. Kept as the reference for how a client must prepare and upload assets (chunking, hashing, clean-URL redirect rules, 404 handling). hosty's own uploaders are ports of this logic. |
| `certified-assets.did`, `docs/`, `ARCHITECTURE.md`, `Makefile`, `rust-toolchain.toml`, `Cargo.lock` | Interface, documentation and reproducible build setup. |

Dropped from upstream: `crates/sync-plugin`, `crates/sync-agent`, `crates/e2e`,
`crates/recipe-gen`, `examples/`, `scripts/`. The `Makefile` was trimmed to the
canister targets only.

## What hosty added

Everything hosty-specific is marked with a `hosty.live patch` comment.

1. `crates/canister/src/cycles.rs` (new file): implementation of
   - `wallet_balance() -> record { amount: nat64 }` (query),
   - `wallet_send(record { canister; amount }) -> variant { Ok; Err: text }`:
     deposits cycles into another canister via the management canister,
   - `tcycles_deposit(record { deposit_args; amount })`: attaches cycles to the
     TCYCLES ledger (`um5iw-rqaaa-aaaaq-qaaba-cai`) `deposit` call, minting
     TCYCLES to the given account. Traps on failure.
2. `crates/canister/src/lib.rs`: exports those three methods behind the
   upstream `guard_is_controller` guard (only controllers can call them).
3. `certified-assets.did`: the three methods and the `WalletResult` type.
4. `crates/canister/Cargo.toml`: `serde` and `serde_bytes` dependencies.
5. Removed upstream `crates/canister-core/src/state/tests.rs` and its two git
   dev-dependencies (`ic-certification-testing` from dfinity/response-verification
   and `ic-crypto-tree-hash` from dfinity/ic). They are test-only, and resolving
   them makes every build clone the multi-gigabyte dfinity/ic repository.

The Candid signatures are identical to the old hosty fork, so the backend
canister (`canisters/src/backend/main.mo`) and the web app keep calling them
the same way.

## Building

Requires `rustup` (the toolchain in `rust-toolchain.toml` is installed
automatically) and `ic-wasm` (`cargo install ic-wasm`).

```sh
cd canisters/certified-assets
make release
```

Outputs in `dist/`:

- `canister-release.wasm.gz`: the module to install (Candid attached as
  `candid:service` metadata), plus `.sha256`.
- `certified-assets.did`: the interface.

The `cargo build` uses `--locked`; if you change dependencies, run a plain
`cargo build` once to refresh `Cargo.lock` and commit it.

## Where the built wasm is used

After a build, the module hash changes and these places must be updated
together (the backend canister refuses to use a canister whose module hash
does not match and reinstalls it):

- `public/assetstorage.wasm.gz`: the web app installs it when a user creates or
  resets a canister. It fetches it as `/assetstorage.wasm.gz?v=<assetStorageHash>`
  and refuses to install it unless its sha256 equals `assetStorageHash`, so the
  file and that constant must change together (`shasum -a 256` of the file).
- `canisters/src/backend/assets.mo`: `HOSTY_ASSETS_MODULE` (hex dump of the
  gzip, produced with `tools/dump-hex.sh`) and `HOSTY_ASSETS_MODULE_HASH`. The
  backend canister installs it on pool canisters. A deployed backend can also be
  updated without redeploying via `setAssetsModule(hash, wasm)`.
- `src/constants/knownHashes.ts`: `assetStorageHash` must be the sha256 of
  `public/assetstorage.wasm.gz` (see above); the file also maps hashes to
  human-readable names and drives `supportsCyclesWithdrawal`.
- Candid bindings for the clients (`src/api/asset-storage` in the web app,
  `src/ic` in `hosty-live-api`).

## Testing a build locally

The upload clients (`hosty-live-api/src/ic/certified-assets-sync.ts`, the web
app's `src/api/certified-assets/sync.ts` and `Assets.uploadDefaultPage` in the
backend canister) implement the canister's sync protocol themselves, so a new
build should be smoke-tested against them. A quick recipe with `icp-cli`:

1. In a scratch directory, write an `icp.yaml` with a `@dfinity/prebuilt`
   canister pointing at `dist/canister-release.wasm` and a `managed` local
   network on a free port; `icp network start -d && icp deploy`.
2. `icp canister call <name> authorize '(principal "<test principal>")'`, then
   run a sync from Node with that identity and check the served pages through
   the local gateway (clean URLs, `_redirects`, 404, gzip, a file above 1.9 MB).
3. `icp canister call <name> wallet_balance '()'` and a small `wallet_send` to
   the canister itself verify the cycles patch; the same call from a
   non-controller must be rejected.

## Upgrading from upstream

1. Diff the new upstream tag against the copied commit above and apply the
   changes to this directory (or re-copy the crates listed in the table and
   re-apply the four hosty changes).
2. Update the version and commit in this README.
3. `make release`, then update the consumers listed above.

Upstream versioning: while the major version is 0, a **minor** bump is a
breaking state change and needs a reinstall (hosty reinstalls anyway when the
module hash differs); a **patch** bump can be upgraded in place.
