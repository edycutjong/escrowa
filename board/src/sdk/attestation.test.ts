import { describe, it, expect } from "vitest";
import { ethers } from "ethers";
import { attestationMessage, didToAddress, verifyAttestation } from "./attestation";

describe("attestation (real ECDSA, no mocks)", () => {
  it("builds a deterministic canonical message", () => {
    const msg = attestationMessage({ milestoneId: "m1", kind: "delivered", by: "did:t3n:0xabc" });
    expect(msg).toContain("Escrowa Attestation");
    expect(msg).toContain("Milestone: m1");
    expect(msg).toContain("Action: delivered");
    expect(msg).toContain("By: did:t3n:0xabc");
  });

  it("extracts the address from a did:t3n, or null when absent", () => {
    expect(didToAddress("did:t3n:0x1111111111111111111111111111111111111111")).toBe(
      "0x1111111111111111111111111111111111111111",
    );
    expect(didToAddress("did:t3n:not-an-address")).toBeNull();
  });

  it("verifies a real wallet signature and rejects a forged one", async () => {
    const wallet = ethers.Wallet.createRandom();
    const did = `did:t3n:${wallet.address}`;
    const message = attestationMessage({ milestoneId: "m1", kind: "approved", by: did });

    // Real personal_sign by the wallet.
    const signature = await wallet.signMessage(message);
    expect(verifyAttestation({ message, signature, expectedDid: did })).toBe(true);

    // Signed by a DIFFERENT wallet -> recovered address won't match the DID.
    const attacker = ethers.Wallet.createRandom();
    const forged = await attacker.signMessage(message);
    expect(verifyAttestation({ message, signature: forged, expectedDid: did })).toBe(false);
  });

  it("returns false for a malformed signature and for a DID without an address", async () => {
    const wallet = ethers.Wallet.createRandom();
    const did = `did:t3n:${wallet.address}`;
    const message = attestationMessage({ milestoneId: "m1", kind: "delivered", by: did });

    expect(verifyAttestation({ message, signature: "0xnotasignature", expectedDid: did })).toBe(false);
    expect(
      verifyAttestation({ message, signature: await wallet.signMessage(message), expectedDid: "did:t3n:foo" }),
    ).toBe(false);
  });
});
