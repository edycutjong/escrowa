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
    const { by, action } = body;

    const client = new T3nClient();
    await client.handshake();
    // Authenticate as the resolving party (e.g. the arbiter or a fallback operator for deadline)
    await client.authenticate(createEthAuthInput(by === "deadline" ? "0xdeadline" : by));

    const milestone = await client.executeAndDecode({
      script_name: "z:tenant:escrow",
      script_version: "1.0.0",
      function_name: "resolve-milestone",
      input: {
        milestoneId: id,
        by,
        action,
      },
    });

    return NextResponse.json({ success: true, milestone });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
