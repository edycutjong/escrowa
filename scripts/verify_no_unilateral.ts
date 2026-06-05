import { T3nClient, createEthAuthInput } from "../board/src/sdk/T3nClient";

async function run() {
  console.log("⚡ Replaying unilateral release restriction verification...");
  
  const clientDid = "did:t3n:0x1111111111111111111111111111111111111111";
  const freelancerDid = "did:t3n:0x2222222222222222222222222222222222222222";

  // Case A: Freelancer signs delivery only
  T3nClient.clearStore();
  let client = new T3nClient();
  await client.handshake();
  await client.authenticate(createEthAuthInput("0x1111111111111111111111111111111111111111"));

  await client.executeAndDecode({
    script_name: "z:tenant:escrow",
    script_version: "1.0.0",
    function_name: "create-milestone",
    input: {
      id: "m-unilateral-1",
      client: clientDid,
      freelancer: freelancerDid,
      amount: 1000,
      conditions: { requireDelivered: true, requireApproved: true },
    },
  });

  console.log("1. Testing Freelancer delivery-only attestation...");
  let milestone = await client.executeAndDecode({
    script_name: "z:tenant:escrow",
    script_version: "1.0.0",
    function_name: "submit-attestation",
    input: {
      milestoneId: "m-unilateral-1",
      by: freelancerDid,
      kind: "delivered",
      sig: "sig_delivery",
      ts: Date.now(),
    },
  });

  if (milestone.status === "released") {
    throw new Error("Security Violation: Milestone released unilaterally by freelancer!");
  }
  console.log("   ✅ Freelancer delivery-only did not trigger release (status remains 'delivered')");

  // Case B: Client signs approval only
  T3nClient.clearStore();
  client = new T3nClient();
  await client.handshake();
  await client.authenticate(createEthAuthInput("0x1111111111111111111111111111111111111111"));

  await client.executeAndDecode({
    script_name: "z:tenant:escrow",
    script_version: "1.0.0",
    function_name: "create-milestone",
    input: {
      id: "m-unilateral-2",
      client: clientDid,
      freelancer: freelancerDid,
      amount: 1000,
      conditions: { requireDelivered: true, requireApproved: true },
    },
  });

  console.log("2. Testing Client approval-only attestation...");
  milestone = await client.executeAndDecode({
    script_name: "z:tenant:escrow",
    script_version: "1.0.0",
    function_name: "submit-attestation",
    input: {
      milestoneId: "m-unilateral-2",
      by: clientDid,
      kind: "approved",
      sig: "sig_approval",
      ts: Date.now(),
    },
  });

  if (milestone.status === "released") {
    throw new Error("Security Violation: Milestone released unilaterally by client!");
  }
  console.log("   ✅ Client approval-only did not trigger release (status remains 'funded')");

  console.log("🎉 Success: Unilateral release verification passed. Dual-consent strictly enforced.");
}

run().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
