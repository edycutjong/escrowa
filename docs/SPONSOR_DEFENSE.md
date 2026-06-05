# SPONSOR DEFENSE — "Why ONLY Terminal 3" (Escrowa)

> API verified against `docs.terminal3.io` (see `../ADK_REFERENCE.md`). Escrowa is a milestone-escrow variant of T3N's documented `payroll-agent` use case.

Escrowa's promise — *neutral custody where no single party (including the agent) can move funds alone* — depends on keys that live inside a TEE and a payout path that can't double-spend. Both are Terminal 3 host interfaces.

## Terminal 3 host interfaces used (by name)
1. **`signing`** — signs the release with a per-wallet key (secp256k1) **held inside the enclave** under `cluster CEK`; the agent never holds raw keys. `contract/src/release.rs`.
2. **`outbox`** — delivers the payout with **idempotency dedup**, so a retry or crash can't pay twice. `contract/src/payout.rs`.
3. **`http-with-placeholders`** — injects payout details (`{{profile.*}}`) without exposing them to the agent/contract plaintext. `contract/src/deliver.rs`.
4. **`did-registry` / `agent-registry`** — verifiable identities for client, freelancer, arbiter, and the Escrowa agent. `agent/src/identity.ts`.
5. **`agent-auth`** — scopes Escrowa to its release functions (no rogue egress). `agent/src/authz.ts`.
6. **TEE (Intel TDX) + attestation** — the release logic + key custody are tamper-proof against a compromised host.

## What you'd need without Terminal 3
- An MPC/HSM or threshold-signing stack to custody keys without a single point of trust.
- A confidential-compute enclave (Intel TDX) + attestation so "release only in-enclave" is real.
- An idempotent payout/delivery pipeline (exactly-once) — non-trivial to get right.
- A DID method + registry for the parties.

→ **Take Terminal 3 out and you'd need ~4 separate systems** (an MPC/HSM custody stack, a TEE+attestation service, an exactly-once payout pipeline, and a DID registry) — and you'd still be trusting *something* with the release decision. T3N's `signing` + `outbox` + TEE collapse them into one host API.

## Honest limitations
- MVP settles in **T3 sandbox test tokens**, not fiat/mainnet value.
- The dispute path is a **single arbiter/deadline rule**, not a full arbitration system.
- Assumes parties' identities/wallets are already provisioned (seeded); no onboarding flow yet.
- Exact ADK npm package name isn't pinned in public docs yet — we target the documented `T3nClient` + `signing`/`outbox` surface.
