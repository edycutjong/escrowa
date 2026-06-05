import { T3nClient, createEthAuthInput } from "./T3nClient";

async function run() {
  const durations: number[] = [];

  for (let i = 0; i < 200; i++) {
    T3nClient.clearStore();
    const client = new T3nClient();
    
    await client.handshake();
    await client.authenticate(createEthAuthInput("0x1111111111111111111111111111111111111111"));
    
    await client.executeAndDecode({
      script_name: "z:tenant:escrow",
      script_version: "1.0.0",
      function_name: "create-milestone",
      input: {
        id: `m-bench-${i}`,
        client: "did:t3n:client",
        freelancer: "did:t3n:freelancer",
        amount: 100,
        conditions: { requireDelivered: true, requireApproved: true }
      }
    });

    await client.executeAndDecode({
      script_name: "z:tenant:escrow",
      script_version: "1.0.0",
      function_name: "submit-attestation",
      input: {
        milestoneId: `m-bench-${i}`,
        by: "did:t3n:freelancer",
        kind: "delivered",
        sig: "sig_del",
        ts: Date.now()
      }
    });

    const start = process.hrtime.bigint();

    // The core release-condition evaluation + signing + outbox trigger
    await client.executeAndDecode({
      script_name: "z:tenant:escrow",
      script_version: "1.0.0",
      function_name: "submit-attestation",
      input: {
        milestoneId: `m-bench-${i}`,
        by: "did:t3n:client",
        kind: "approved",
        sig: "sig_app",
        ts: Date.now()
      }
    });

    const end = process.hrtime.bigint();
    const durationNs = Number(end - start);
    const durationMs = durationNs / 1_000_000;
    durations.push(durationMs);
  }

  console.log(JSON.stringify(durations));
}

run().catch(console.error);
