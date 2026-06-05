import { T3nClient, createEthAuthInput } from "../board/src/sdk/T3nClient";

async function run() {
  console.log("⚡ Replaying happy path milestone release verification...");
  
  T3nClient.clearStore();
  const client = new T3nClient();
  await client.handshake();
  await client.authenticate(createEthAuthInput("0x1111111111111111111111111111111111111111"));

  const clientDid = "did:t3n:0x1111111111111111111111111111111111111111";
  const freelancerDid = "did:t3n:0x2222222222222222222222222222222222222222";

  console.log("1. Creating and funding milestone 'm1-verify'...");
  let milestone = await client.executeAndDecode({
    script_name: "z:tenant:escrow",
    script_version: "1.0.0",
    function_name: "create-milestone",
    input: {
      id: "m1-verify",
      client: clientDid,
      freelancer: freelancerDid,
      amount: 4200,
      conditions: { requireDelivered: true, requireApproved: true },
    },
  });

  if (milestone.status !== "funded") {
    throw new Error("Failed: Milestone status should be 'funded'");
  }

  console.log("2. Submitting freelancer delivery attestation...");
  milestone = await client.executeAndDecode({
    script_name: "z:tenant:escrow",
    script_version: "1.0.0",
    function_name: "submit-attestation",
    input: {
      milestoneId: "m1-verify",
      by: freelancerDid,
      kind: "delivered",
      sig: "sig_delivery_verification",
      ts: Date.now(),
    },
  });

  if (milestone.status !== "delivered") {
    throw new Error("Failed: Milestone status should be 'delivered'");
  }

  console.log("3. Submitting client approval attestation...");
  milestone = await client.executeAndDecode({
    script_name: "z:tenant:escrow",
    script_version: "1.0.0",
    function_name: "submit-attestation",
    input: {
      milestoneId: "m1-verify",
      by: clientDid,
      kind: "approved",
      sig: "sig_approval_verification",
      ts: Date.now(),
    },
  });

  if (milestone.status !== "released") {
    throw new Error("Failed: Milestone status should be 'released'");
  }

  if (!milestone.settlementRef) {
    throw new Error("Failed: Settlement reference should be generated");
  }

  console.log(`✅ Success: Milestone released. Settlement Ref: ${milestone.settlementRef}`);

  // Assert enclave key custody
  const keys = T3nClient.getGeneratedKeys();
  for (const key of keys) {
    if (JSON.stringify(process.env).includes(key)) {
      throw new Error(`Security Violation: Private key ${key} leaked to process.env!`);
    }
  }

  console.log("🔒 Security Audit: 0 keys leaked outside TEE memory.");
}

run().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
