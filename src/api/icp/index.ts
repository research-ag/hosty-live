/**
 * ICP deposits into the cycles balance. The user sends ICP from any wallet to their own ICP
 * ledger account (their principal, no subaccount): only their Internet Identity controls it,
 * and no wallet has to set a memo. The web app then converts it as the user: an ICRC-1
 * transfer to the cycles minting canister's (CMC) subaccount of the user with the MINT memo,
 * then `notify_mint_cycles`, which mints the cycles into the user's cycles-ledger account.
 *
 * The functions take the agent so they can be exercised outside the browser.
 */
import { Actor, type HttpAgent } from "@icp-sdk/core/agent";
import { IDL } from "@icp-sdk/core/candid";
import { Principal } from "@icp-sdk/core/principal";
import { sha224 } from "@noble/hashes/sha2";

export const ICP_LEDGER_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";
export const CMC_CANISTER_ID = "rkp4c-7iaaa-aaaaa-aaaca-cai";
export const ICP_FEE_E8S = 10_000n;
export const E8S_PER_ICP = 100_000_000n;

/** "MINT" as the CMC expects it in an ICRC-1 memo: the u64 0x544e494d, little endian. */
const MINT_MEMO = new Uint8Array([0x4d, 0x49, 0x4e, 0x54, 0, 0, 0, 0]);

const Account = IDL.Record({ owner: IDL.Principal, subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)) });

/** The part of the ICP ledger's interface used here (ICRC-1 balance and transfer). */
const ledgerIdl: IDL.InterfaceFactory = ({ IDL }) => {
  const TransferError = IDL.Variant({
    GenericError: IDL.Record({ message: IDL.Text, error_code: IDL.Nat }),
    TemporarilyUnavailable: IDL.Null,
    BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    BadFee: IDL.Record({ expected_fee: IDL.Nat }),
    CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
    TooOld: IDL.Null,
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
  });
  return IDL.Service({
    icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ["query"]),
    icrc1_transfer: IDL.Func(
      [
        IDL.Record({
          to: Account,
          fee: IDL.Opt(IDL.Nat),
          memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
          from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
          created_at_time: IDL.Opt(IDL.Nat64),
          amount: IDL.Nat,
        }),
      ],
      [IDL.Variant({ Ok: IDL.Nat, Err: TransferError })],
      []
    ),
  });
};

/** The part of the cycles minting canister's interface used here (rate and mint). */
const cmcIdl: IDL.InterfaceFactory = ({ IDL }) => {
  const NotifyError = IDL.Variant({
    Refunded: IDL.Record({ reason: IDL.Text, block_index: IDL.Opt(IDL.Nat64) }),
    Processing: IDL.Null,
    TransactionTooOld: IDL.Nat64,
    InvalidTransaction: IDL.Text,
    Other: IDL.Record({ error_code: IDL.Nat64, error_message: IDL.Text }),
  });
  return IDL.Service({
    get_icp_xdr_conversion_rate: IDL.Func(
      [],
      [
        IDL.Record({
          data: IDL.Record({ timestamp_seconds: IDL.Nat64, xdr_permyriad_per_icp: IDL.Nat64 }),
          certificate: IDL.Vec(IDL.Nat8),
          hash_tree: IDL.Vec(IDL.Nat8),
        }),
      ],
      ["query"]
    ),
    notify_mint_cycles: IDL.Func(
      [
        IDL.Record({
          block_index: IDL.Nat64,
          to_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
          deposit_memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
        }),
      ],
      [
        IDL.Variant({
          Ok: IDL.Record({ block_index: IDL.Nat, minted: IDL.Nat, balance: IDL.Nat }),
          Err: NotifyError,
        }),
      ],
      []
    ),
  });
};

type TransferError = Record<string, unknown>;
type NotifyError =
  | { Refunded: { reason: string; block_index: [] | [bigint] } }
  | { Processing: null }
  | { TransactionTooOld: bigint }
  | { InvalidTransaction: string }
  | { Other: { error_code: bigint; error_message: string } };

interface LedgerService {
  icrc1_balance_of(account: { owner: Principal; subaccount: [] | [Uint8Array] }): Promise<bigint>;
  icrc1_transfer(arg: {
    to: { owner: Principal; subaccount: [] | [Uint8Array] };
    fee: [] | [bigint];
    memo: [] | [Uint8Array];
    from_subaccount: [] | [Uint8Array];
    created_at_time: [] | [bigint];
    amount: bigint;
  }): Promise<{ Ok: bigint } | { Err: TransferError }>;
}

interface CmcService {
  get_icp_xdr_conversion_rate(): Promise<{
    data: { timestamp_seconds: bigint; xdr_permyriad_per_icp: bigint };
  }>;
  notify_mint_cycles(arg: {
    block_index: bigint;
    to_subaccount: [] | [Uint8Array];
    deposit_memo: [] | [Uint8Array];
  }): Promise<
    | { Ok: { block_index: bigint; minted: bigint; balance: bigint } }
    | { Err: NotifyError }
  >;
}

/** ICP ledger actor signing with `agent`. */
function ledger(agent: HttpAgent) {
  return Actor.createActor<LedgerService>(ledgerIdl, { agent, canisterId: ICP_LEDGER_CANISTER_ID });
}

/** Cycles minting canister actor signing with `agent`. */
function cmc(agent: HttpAgent) {
  return Actor.createActor<CmcService>(cmcIdl, { agent, canisterId: CMC_CANISTER_ID });
}

/** The CMC's convention: length byte, principal bytes, zero padding to 32 bytes. */
export function principalToSubaccount(principal: Principal): Uint8Array {
  const bytes = principal.toUint8Array();
  const sub = new Uint8Array(32);
  sub[0] = bytes.length;
  sub.set(bytes, 1);
  return sub;
}

/** Legacy ICP account identifier (hex) of a principal's default account, for exchanges. */
export function accountIdentifierHex(owner: Principal): string {
  const hash = sha224
    .create()
    .update(new TextEncoder().encode("\x0Aaccount-id"))
    .update(owner.toUint8Array())
    .update(new Uint8Array(32))
    .digest();
  const crc = crc32(hash);
  const checksum = new Uint8Array([crc >>> 24, (crc >>> 16) & 0xff, (crc >>> 8) & 0xff, crc & 0xff]);
  return [...checksum, ...hash].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** CRC-32 (IEEE), the checksum prefix of an account identifier. */
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * ICRC-22 payment request (`icp:<address>?amount=<ICP>`), what the NNS dapp and Oisy read from
 * a QR code. Amounts are in ICP, at most 8 decimals.
 */
export function icpPaymentUri(owner: Principal, amountE8s?: bigint): string {
  const uri = `icp:${owner.toText()}`;
  return amountE8s && amountE8s > 0n ? `${uri}?amount=${formatIcp(amountE8s)}` : uri;
}

/** e8s as an ICP decimal without trailing zeros, e.g. 150000000n -> "1.5". */
export function formatIcp(e8s: bigint): string {
  const whole = e8s / E8S_PER_ICP;
  const frac = (e8s % E8S_PER_ICP).toString().padStart(8, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

/** ICP (e8s) in the default account of `owner`. */
export async function getIcpBalance(agent: HttpAgent, owner: Principal): Promise<bigint> {
  return ledger(agent).icrc1_balance_of({ owner, subaccount: [] });
}

/** Teracycles one ICP mints at the CMC's current rate (1 XDR = 1T cycles). */
export async function getTCPerIcp(agent: HttpAgent): Promise<number> {
  const { data } = await cmc(agent).get_icp_xdr_conversion_rate();
  return Number(data.xdr_permyriad_per_icp) / 10_000;
}

const TRANSFER_ATTEMPTS = 3;

/**
 * Moves `amountE8s` (the fee comes on top) from the caller's default ICP account to its CMC
 * subaccount with the MINT memo. Returns the ledger block index to notify.
 *
 * With `created_at_time` set the ledger deduplicates: when a call fails without an answer
 * (it may still have gone through), the identical request is sent again and a `Duplicate`
 * answer yields the block index of the first one, so it can still be notified.
 */
export async function sendIcpToCmc(agent: HttpAgent, amountE8s: bigint): Promise<bigint> {
  const owner = await agent.getPrincipal();
  const request = {
    to: { owner: Principal.fromText(CMC_CANISTER_ID), subaccount: [principalToSubaccount(owner)] as [Uint8Array] },
    fee: [ICP_FEE_E8S] as [bigint],
    memo: [MINT_MEMO] as [Uint8Array],
    from_subaccount: [] as [],
    // the agent's offset to the IC's clock, so a skewed local clock is not CreatedInFuture
    created_at_time: [BigInt(Date.now() + agent.getTimeDiffMsecs()) * 1_000_000n] as [bigint],
    amount: amountE8s,
  };
  let res: Awaited<ReturnType<LedgerService["icrc1_transfer"]>>;
  for (let attempt = 1; ; attempt++) {
    try {
      res = await ledger(agent).icrc1_transfer(request);
      break;
    } catch (err) {
      if (attempt >= TRANSFER_ATTEMPTS) throw err;
    }
  }
  if ("Err" in res) {
    const duplicate = (res.Err as { Duplicate?: { duplicate_of: bigint } }).Duplicate;
    if (duplicate) return duplicate.duplicate_of;
    const [kind, detail] = Object.entries(res.Err)[0] ?? ["Unknown", null];
    if (kind === "InsufficientFunds") throw new Error("Insufficient ICP balance.");
    if (kind === "BadFee") throw new Error("The ICP ledger fee changed; please try again.");
    const message = (detail as { message?: string } | null)?.message;
    throw new Error(`ICP transfer failed: ${message ?? kind}`);
  }
  return res.Ok;
}

export type MintResult =
  | { status: "minted"; minted: bigint; balance: bigint }
  | { status: "refunded"; reason: string }
  /** Retriable: the CMC is still processing the block, or the call failed. */
  | { status: "pending"; reason: string }
  /** Not retriable, the ICP is not credited: the message says why. */
  | { status: "failed"; reason: string };

/** Asks the CMC to mint cycles for an ICP transfer into the caller's CMC subaccount. */
export async function notifyMintCycles(agent: HttpAgent, blockIndex: bigint): Promise<MintResult> {
  let res;
  try {
    res = await cmc(agent).notify_mint_cycles({ block_index: blockIndex, to_subaccount: [], deposit_memo: [] });
  } catch (err) {
    return { status: "pending", reason: err instanceof Error ? err.message : String(err) };
  }
  if ("Ok" in res) return { status: "minted", minted: res.Ok.minted, balance: res.Ok.balance };
  const err = res.Err;
  if ("Processing" in err) return { status: "pending", reason: "The cycles minting canister is processing it." };
  if ("Refunded" in err) return { status: "refunded", reason: err.Refunded.reason };
  if ("TransactionTooOld" in err) return { status: "failed", reason: "The ICP transfer is too old to be converted." };
  if ("InvalidTransaction" in err) return { status: "failed", reason: err.InvalidTransaction };
  return { status: "failed", reason: err.Other.error_message };
}
