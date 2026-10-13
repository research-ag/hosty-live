//! hosty.live patch: cycle management for the assets canister.
//!
//! This module is NOT part of upstream `dfinity/certified-assets`. It is the
//! hosty.live addition that lets a controller move cycles out of a frontend
//! canister: either to another canister (`wallet_send`) or into a TCYCLES
//! ledger account (`tcycles_deposit`). The methods were ported from the
//! previous hosty fork of the dfinity/sdk asset canister
//! (`research-ag/sdk`, branch `hostybot-0.0.1`) so the Candid interface and
//! behaviour are unchanged for the hosty backend canister and web app.
//!
//! All three entry points are exported from `lib.rs` behind the upstream
//! `guard_is_controller` guard, so only canister controllers can call them.

use candid::{CandidType, Deserialize, Principal};
use serde_bytes::ByteBuf;

/// The TCYCLES ledger canister (mainnet). `tcycles_deposit` attaches cycles to
/// a call of its `deposit` method, which mints TCYCLES to the given account.
const TCYCLES_LEDGER: &str = "um5iw-rqaaa-aaaaq-qaaba-cai";

#[derive(CandidType)]
pub struct BalanceResult {
    pub amount: u64,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct WalletSendArg {
    pub canister: Principal,
    pub amount: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Icrc1Account {
    pub owner: Principal,
    pub subaccount: Option<ByteBuf>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct DepositArgs {
    pub to: Icrc1Account,
    pub memo: Option<ByteBuf>,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct TCyclesDepositArg {
    pub deposit_args: DepositArgs,
    pub amount: u64,
}

#[derive(CandidType)]
struct DepositCyclesArgs {
    canister_id: Principal,
}

/// The cycle balance of this canister, as a `nat64` to match the old interface.
pub fn wallet_balance() -> BalanceResult {
    BalanceResult {
        amount: ic_cdk::api::canister_cycle_balance()
            .try_into()
            .expect("Balance exceeded a 64-bit value"),
    }
}

/// Send `amount` cycles to another canister via the management canister's
/// `deposit_cycles`.
pub async fn wallet_send(WalletSendArg { canister, amount }: WalletSendArg) -> Result<(), String> {
    ic_cdk::call::Call::unbounded_wait(Principal::management_canister(), "deposit_cycles")
        .with_arg(DepositCyclesArgs {
            canister_id: canister,
        })
        .with_cycles(amount as u128)
        .await
        .map_err(|e| {
            let refund = ic_cdk::api::msg_cycles_refunded();
            format!(
                "Cycles sent: {amount}\nCycles refunded: {refund}\nAn error happened during the call: {e}"
            )
        })?;
    Ok(())
}

/// Mint TCYCLES by depositing `amount` of this canister's cycles into the
/// TCYCLES ledger account `deposit_args.to`.
pub async fn tcycles_deposit(
    TCyclesDepositArg {
        deposit_args,
        amount,
    }: TCyclesDepositArg,
) -> Result<(), String> {
    let ledger = Principal::from_text(TCYCLES_LEDGER).expect("Invalid TCYCLES ledger principal");
    ic_cdk::call::Call::unbounded_wait(ledger, "deposit")
        .with_arg(deposit_args)
        .with_cycles(amount as u128)
        .await
        .map_err(|e| {
            let refund = ic_cdk::api::msg_cycles_refunded();
            format!(
                "Cycles sent: {amount}\nCycles refunded: {refund}\nAn error happened during the call: {e}"
            )
        })?;
    Ok(())
}
