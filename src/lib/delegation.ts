import {
  DelegationChain,
  DelegationIdentity,
  Ed25519PublicKey,
  isDelegationValid,
} from "@icp-sdk/core/identity";
import { getAuthClient } from "../hooks/useInternetIdentity";

/**
 * Sub-delegates the user's Internet Identity session to the hosty API's ephemeral
 * session key. The identity held by AuthClient is a DelegationIdentity that signs with
 * the browser session key, which is exactly what DelegationChain.create needs when
 * `previous` is given; no extra key management is required. The result cannot outlive
 * the II delegation, so the expiry is clamped to it.
 */
export async function createDeployDelegation(
  publicKeyDerHex: string,
  requestedExpiresAt: Date,
): Promise<{ delegationChain: unknown; expiresAt: Date }> {
  const client = await getAuthClient();
  const identity = client.getIdentity();
  if (!(identity instanceof DelegationIdentity)) {
    throw new Error("Sign in with Internet Identity first");
  }
  const previous = identity.getDelegation();
  if (!isDelegationValid(previous)) {
    throw new Error("Your Internet Identity session has expired. Sign in again.");
  }
  const iiExpiryMs = Math.min(
    ...previous.delegations.map((d) => Number(d.delegation.expiration / 1_000_000n)),
  );
  const expiresAt = new Date(Math.min(requestedExpiresAt.getTime(), iiExpiryMs - 1_000));
  if (expiresAt.getTime() <= Date.now()) {
    throw new Error("Your Internet Identity session is about to expire. Sign in again.");
  }
  const apiKey = Ed25519PublicKey.fromDer(hexToBytes(publicKeyDerHex));
  const chain = await DelegationChain.create(identity, apiKey, expiresAt, { previous });
  return { delegationChain: chain.toJSON(), expiresAt };
}

/** Expiry of the current Internet Identity delegation, or null when signed out. */
export async function getIdentityExpiry(): Promise<Date | null> {
  const client = await getAuthClient();
  const identity = client.getIdentity();
  if (!(identity instanceof DelegationIdentity)) return null;
  const chain = identity.getDelegation();
  const ms = Math.min(...chain.delegations.map((d) => Number(d.delegation.expiration / 1_000_000n)));
  return new Date(ms);
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
