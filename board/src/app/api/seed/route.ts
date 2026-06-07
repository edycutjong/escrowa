import { NextResponse } from "next/server";
import { T3nClient, createEthAuthInput } from "@/sdk/T3nClient";
import { clearStore } from "@/wasm/host";
import { registerDid, registerAgent } from "@/sdk/didRegistry";
import { updateAgentAuth, ESCROWA_AGENT_DID, ESCROWA_DEFAULT_SCOPE } from "@/sdk/agentAuth";
import { persist } from "@/sdk/store";

export async function POST() {
  T3nClient.clearStore();
  clearStore();
  const client = new T3nClient();
  await client.handshake();
  await client.authenticate(createEthAuthInput("0x1111111111111111111111111111111111111111"));

  const clientDid = "did:t3n:0x1111111111111111111111111111111111111111";
  const freelancerDid = "did:t3n:0x2222222222222222222222222222222222222222";
  const arbiterDid = "did:t3n:0x3333333333333333333333333333333333333333";

  // did-registry / agent-registry: link the parties' authenticators to their
  // did:t3n identities, then publish the Escrowa agent URI.
  registerDid(clientDid, "0x1111111111111111111111111111111111111111");
  registerDid(freelancerDid, "0x2222222222222222222222222222222222222222");
  registerDid(arbiterDid, "0x3333333333333333333333333333333333333333");
  registerAgent(ESCROWA_AGENT_DID, "https://escrowa.edycu.dev/.well-known/agent");

  // agent-auth: provision Escrowa's least-privilege scope (escrow functions +
  // settlement egress only). The host blocks anything outside this grant.
  updateAgentAuth(ESCROWA_AGENT_DID, ESCROWA_DEFAULT_SCOPE);

  try {
    // Scenario 1: m1-happy (ready for client approval)
    await client.executeAndDecode({
      script_name: "z:tenant:escrow",
      script_version: "1.0.0",
      function_name: "create-milestone",
      input: {
        id: "m1-happy",
        client: clientDid,
        freelancer: freelancerDid,
        amount: 4200,
        conditions: { requireDelivered: true, requireApproved: true },
      },
    });

    // Freelancer attests delivery for m1-happy
    await client.executeAndDecode({
      script_name: "z:tenant:escrow",
      script_version: "1.0.0",
      function_name: "submit-attestation",
      input: {
        milestoneId: "m1-happy",
        by: freelancerDid,
        kind: "delivered",
        sig: "sig_priya_delivery_m1",
        ts: Date.now(),
      },
    });

    // Scenario 2: m2-ghost (freelancer delivered, client silent, ready for deadline resolution)
    await client.executeAndDecode({
      script_name: "z:tenant:escrow",
      script_version: "1.0.0",
      function_name: "create-milestone",
      input: {
        id: "m2-ghost",
        client: clientDid,
        freelancer: freelancerDid,
        amount: 1000,
        conditions: {
          requireDelivered: true,
          requireApproved: true,
          deadline: Date.now() - 3600 * 1000, // Passed 1 hour ago
        },
      },
    });

    await client.executeAndDecode({
      script_name: "z:tenant:escrow",
      script_version: "1.0.0",
      function_name: "submit-attestation",
      input: {
        milestoneId: "m2-ghost",
        by: freelancerDid,
        kind: "delivered",
        sig: "sig_priya_delivery_m2",
        ts: Date.now() - 7200 * 1000,
      },
    });

    // Scenario 3: m3-dispute (freelancer delivered, client rejects, arbiter gated)
    await client.executeAndDecode({
      script_name: "z:tenant:escrow",
      script_version: "1.0.0",
      function_name: "create-milestone",
      input: {
        id: "m3-dispute",
        client: clientDid,
        freelancer: freelancerDid,
        amount: 2500,
        conditions: {
          requireDelivered: true,
          requireApproved: true,
          arbiter: arbiterDid,
        },
      },
    });

    await client.executeAndDecode({
      script_name: "z:tenant:escrow",
      script_version: "1.0.0",
      function_name: "submit-attestation",
      input: {
        milestoneId: "m3-dispute",
        by: freelancerDid,
        kind: "delivered",
        sig: "sig_priya_delivery_m3",
        ts: Date.now() - 3600 * 1000,
      },
    });

    await persist();
    return NextResponse.json({ success: true, message: "Deterministic scenarios seeded" });
  } catch (e: unknown) {
    if (e instanceof Error && (e.message?.includes("already exists") || e.message?.includes("already completed") || e.message?.includes("already attested"))) {
      await persist();
      return NextResponse.json({ success: true, message: "Already seeded (ignoring error)" });
    }
    throw e;
  }
}
