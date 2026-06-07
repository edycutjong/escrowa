/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { T3nClient, createEthAuthInput } from "@/sdk/T3nClient";
import { attestationMessage, verifyAttestation } from "@/sdk/attestation";
import { hydrate, persist } from "@/sdk/store";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await hydrate();
    const { id } = await params;
    const body = await req.json();
    const { by, kind, sig, signer } = body;

    // Wallet-signed attestations carry a `signer`; verify the REAL signature
    // (ecrecover) against the attesting party's DID before touching the contract.
    // The server rebuilds the canonical message — it never trusts a client-sent one.
    if (signer) {
      const message = attestationMessage({ milestoneId: id, kind, by });
      if (!verifyAttestation({ message, signature: sig, expectedDid: by })) {
        return NextResponse.json(
          { success: false, error: "Invalid wallet signature" },
          { status: 401 }
        );
      }
    }

    const client = new T3nClient();
    await client.handshake();
    await client.authenticate(createEthAuthInput(by)); // Authenticate as the attesting party

    const milestone = await client.executeAndDecode({
      script_name: "z:tenant:escrow",
      script_version: "1.0.0",
      function_name: "submit-attestation",
      input: {
        milestoneId: id,
        by,
        kind,
        sig,
        ts: Date.now(),
      },
    });

    await persist();
    return NextResponse.json({ success: true, milestone });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
