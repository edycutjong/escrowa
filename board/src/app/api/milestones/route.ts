/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { T3nClient, createEthAuthInput } from "@/sdk/T3nClient";

export async function GET() {
  const milestones = T3nClient.getAllMilestones();
  return NextResponse.json(milestones);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, clientDid, freelancerDid, amount, requireDelivered, requireApproved, deadline, arbiter } = body;

    const client = new T3nClient();
    await client.handshake();
    await client.authenticate(createEthAuthInput("0x1111111111111111111111111111111111111111"));

    const milestone = await client.executeAndDecode({
      script_name: "z:tenant:escrow",
      script_version: "1.0.0",
      function_name: "create-milestone",
      input: {
        id,
        client: clientDid,
        freelancer: freelancerDid,
        amount: parseFloat(amount),
        conditions: {
          requireDelivered: requireDelivered ?? true,
          requireApproved: requireApproved ?? true,
          deadline: deadline ? parseInt(deadline) : undefined,
          arbiter: arbiter || undefined,
        },
      },
    });

    return NextResponse.json({ success: true, milestone });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
