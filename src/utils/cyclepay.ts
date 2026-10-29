/**
 * CyclePay (https://www.cyclepay.org) direct links: card payment delivered as cycles into a
 * canister or a principal's cycles-ledger balance, no sign-in, whole US dollars from 5 to
 * 100. Keep the pricing equal to the API's src/canisters/cyclepay.ts.
 */
const CYCLEPAY_WEB = "https://www.cyclepay.org";
export const CARD_LINK_MIN_USD = 5;
export const CARD_LINK_MAX_USD = 100;

/**
 * 1 XDR (= 1T cycles) in USD and Stripe's card fee, as published 2026-10-28. CyclePay
 * prices each payment at its live rate (get_xdr_rate_status), so the dollars computed here
 * are an estimate for the prefill, not a promise of the entered TC; the user can change
 * the amount on the payment page.
 */
const XDR_USD = 1.36;
const CARD_FEE_RATE = 0.029;
const CARD_FEE_FIXED_USD = 0.3;

export function cyclePayCanisterUrl(canisterId: string, usd: number): string {
  return `${CYCLEPAY_WEB}/c/${canisterId}/${clampLinkUsd(usd)}`;
}

export function cyclePayBalanceUrl(principal: string, usd: number): string {
  return `${CYCLEPAY_WEB}/b/${principal}/${clampLinkUsd(usd)}`;
}

export function clampLinkUsd(usd: number): number {
  const whole = Math.ceil(Number.isFinite(usd) ? usd : CARD_LINK_MIN_USD);
  return Math.min(CARD_LINK_MAX_USD, Math.max(CARD_LINK_MIN_USD, whole));
}

/** About the whole dollars `tc` teracycles cost after the card fee (clamped to the link range). */
export function usdForTC(tc: number): number {
  if (!Number.isFinite(tc) || tc <= 0) return CARD_LINK_MIN_USD;
  const gross = (tc * XDR_USD + CARD_FEE_FIXED_USD) / (1 - CARD_FEE_RATE);
  return clampLinkUsd(gross);
}
