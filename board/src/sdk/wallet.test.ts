import { describe, it, expect } from "vitest";
import { ethers } from "ethers";
import { addressToDid, buildAttestationSig } from "./wallet";
import { verifyAttestation, attestationMessage } from "./attestation";

describe("wallet attestation signing", () => {
  it("addressToDid lowercases into a did:t3n", () => {
    expect(addressToDid("0xAbC0000000000000000000000000000000000000")).toBe(
      "did:t3n:0xabc0000000000000000000000000000000000000",
    );
  });

  it("buildAttestationSig produces a REAL, verifiable signature via the signer callback", async () => {
    const wallet = ethers.Wallet.createRandom();
    const did = `did:t3n:${wallet.address}`;
    // The signer callback is backed by a real wallet (mirrors wagmi's signMessageAsync).
    const signMessageAsync = async ({ message }: { message: string }) => wallet.signMessage(message);

    const { sig, signer } = await buildAttestationSig(
      wallet.address,
      signMessageAsync,
      { milestoneId: "m1", kind: "delivered", by: did },
      "unused-fallback",
    );

    expect(signer).toBe(wallet.address);
    const message = attestationMessage({ milestoneId: "m1", kind: "delivered", by: did });
    expect(verifyAttestation({ message, signature: sig, expectedDid: did })).toBe(true);
  });

  it("buildAttestationSig handles a missing 'by' on the wallet path", async () => {
    const { sig, signer } = await buildAttestationSig(
      "0xabc",
      async ({ message }) => `signed:${message}`,
      { milestoneId: "m1", kind: "approved" },
      "fb",
    );
    expect(signer).toBe("0xabc");
    expect(sig).toContain("By: ");
  });

  it("buildAttestationSig falls back to the simulated sig with no wallet", async () => {
    const a = await buildAttestationSig(null, null, { milestoneId: "m1", kind: "delivered" }, "sim-sig");
    expect(a).toEqual({ sig: "sim-sig" });
    // Also covers the case where an address exists but no signer callback.
    const b = await buildAttestationSig("0xabc", null, { milestoneId: "m1", kind: "delivered" }, "sim-sig");
    expect(b).toEqual({ sig: "sim-sig" });
  });
});
