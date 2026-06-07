import { attestationMessage } from "./attestation";

/** `did:t3n:<address>` from a wallet address. */
export function addressToDid(address: string): string {
  return `did:t3n:${address.toLowerCase()}`;
}

/** wagmi's `signMessageAsync` shape. */
export type SignMessageFn = (args: { message: string }) => Promise<string>;

/**
 * Produce an attestation signature for a milestone action.
 * - Wallet connected (address + signer) → a REAL EIP-191 signature over the
 *   canonical message; returns `signer` so the server can verify it (ecrecover).
 * - No wallet → a simulated sig for the seeded demo (no `signer` → not verified).
 *   This is the only non-real path and exists solely so the seeded demo works.
 */
export async function buildAttestationSig(
  address: string | null | undefined,
  signMessageAsync: SignMessageFn | null | undefined,
  params: { milestoneId: string; kind: "delivered" | "approved"; by?: string },
  fallbackSig: string,
): Promise<{ sig: string; signer?: string }> {
  if (address && signMessageAsync) {
    const message = attestationMessage({
      milestoneId: params.milestoneId,
      kind: params.kind,
      by: params.by ?? "",
    });
    const sig = await signMessageAsync({ message });
    return { sig, signer: address };
  }
  return { sig: fallbackSig };
}
