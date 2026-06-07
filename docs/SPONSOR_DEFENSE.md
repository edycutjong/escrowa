# SPONSOR DEFENSE — "Why ONLY Terminal 3" (Escrowa)

> API verified against `docs.terminal3.io` (see `../ADK_REFERENCE.md`). Escrowa is a milestone-escrow variant of T3N's documented `payroll-agent` use case.

Escrowa's promise — *neutral custody where no single party (including the agent) can move funds alone* — depends on keys that live inside a TEE and a payout path that can't double-spend. Both are Terminal 3 host interfaces.

## Terminal 3 host interfaces used (by name)
1. **`signing`** — signs the release with a per-wallet key (secp256k1) **held inside the enclave** under `cluster CEK`; the agent never holds raw keys. `contract/src/lib.rs` (`trigger_release` → `host::sign_secp256k1`).
2. **`outbox`** — delivers the payout with **idempotency dedup**, so a retry or crash can't pay twice. `contract/src/lib.rs` (`host::outbox_post`).
3. **`http-with-placeholders`** — injects payout details (`{{profile.*}}`) without exposing them to the agent/contract plaintext. Exposed in the host interface (`contract/wit/escrow.wit`, `board/src/wasm/host.ts`).
4. **`did-registry` / `agent-registry`** — verifiable identities for client, freelancer, arbiter, and the Escrowa agent. `board/src/sdk/didRegistry.ts` (wired in `board/src/app/api/seed/route.ts`).
5. **`agent-auth`** — scopes Escrowa to its release/refund functions + egress allowlist (no rogue egress). `board/src/sdk/agentAuth.ts` (enforced in `board/src/sdk/T3nClient.ts`).
6. **TEE (Intel TDX) + attestation** — the release logic + key custody are tamper-proof against a compromised host.

## What you'd need without Terminal 3
- An MPC/HSM or threshold-signing stack to custody keys without a single point of trust.
- A confidential-compute enclave (Intel TDX) + attestation so "release only in-enclave" is real.
- An idempotent payout/delivery pipeline (exactly-once) — non-trivial to get right.
- A DID method + registry for the parties.

→ **Take Terminal 3 out and you'd need ~4 separate systems** (an MPC/HSM custody stack, a TEE+attestation service, an exactly-once payout pipeline, and a DID registry) — and you'd still be trusting *something* with the release decision. T3N's `signing` + `outbox` + TEE collapse them into one host API.

## Alignment with Terminal 3's documented use cases
T3N's own [Delegate Access to AI Agents](https://docs.terminal3.io/t3n/use-cases/delegate-access-to-agent) use cases (B2B procurement, payroll) describe agents that **transact under explicit, policy-bound delegation** while **never holding the payment keys** — *"instead of accessing payment keys directly, the agent submits an instruction to T3N, which securely delivers the pre-configured payment info … sensitive data is never exposed to the agent."*

Escrowa is a focused instance of that exact pattern, specialized for **milestone escrow/settlement**:
- **Policy-bound delegation** → the agent holds a least-privilege `agent-auth` scope (release/refund + settlement egress only).
- **Agent never holds keys** → the release key lives in the TEE (`signing`); the agent submits a release instruction, the enclave signs.
- **Verifiable approvals** → dual `did:t3n` attestations (freelancer "delivered" + client "approved") are the release condition.
- **Auditable execution** → every attestation + TEE proof + settlement reference is logged.

**Difference:** T3N's procurement/payroll flows gate on *policy constraints + human/workflow approvals*; Escrowa gates on *mutual cryptographic attestation* (no single party — including Escrowa — can release alone), with deadline/arbiter fallbacks. Same trust model, specialized for two-party settlement.

## Honest limitations
- MVP settles in **T3 sandbox test tokens**, not fiat/mainnet value.
- The dispute path is a **single arbiter/deadline rule**, not a full arbitration system.
- Assumes parties' identities/wallets are already provisioned (seeded); no onboarding flow yet.
- The release path depends on host interfaces (`signing`, `outbox`, `did-registry`, `agent-auth`) that are currently **"Coming soon"** for tenant contracts (per `t3n/how-t3n-works/host-api`), so this build runs against a local simulation. The real `@terminal3/t3n-sdk` registration flow is scaffolded and ready in `scripts/register-contract.ts` (`make register`) for when they go live.
