/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { T3nClient, createEthAuthInput } from "@/sdk/T3nClient";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { by, kind, sig } = body;

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

    return NextResponse.json({ success: true, milestone });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
