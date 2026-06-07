import { ethers } from "ethers";

/**
 * Canonical attestation message. The SAME builder is used on the client (to sign)
 * and on the server (to verify), so the server never trusts a client-supplied
 * message — it reconstructs it from the milestone id + kind + signer DID.
 */
export function attestationMessage(params: {
  milestoneId: string;
  kind: "delivered" | "approved";
  by: string;
}): string {
  return [
    "Escrowa Attestation",
    `Milestone: ${params.milestoneId}`,
    `Action: ${params.kind}`,
    `By: ${params.by}`,
  ].join("\n");
}

/** Extract the Ethereum address embedded in a `did:t3n:0x...` identity. */
export function didToAddress(did: string): string | null {
  const match = /0x[0-9a-fA-F]{40}/.exec(did);
  return match ? match[0] : null;
}

/**
 * Real ECDSA verification (EIP-191 personal_sign). Recovers the signer from the
 * signature and asserts it matches the address bound to `expectedDid`.
 * This is genuine `ecrecover` — not a mock string comparison.
 */
export function verifyAttestation(params: {
  message: string;
  signature: string;
  expectedDid: string;
}): boolean {
  const expected = didToAddress(params.expectedDid);
  if (!expected) return false;
  try {
    const recovered = ethers.verifyMessage(params.message, params.signature);
    return recovered.toLowerCase() === expected.toLowerCase();
  } catch {
    return false;
  }
}
