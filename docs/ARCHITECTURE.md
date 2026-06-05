# ARCHITECTURE — Escrowa

> API verified against `docs.terminal3.io`. Key custody + release signing is the **`signing`** host interface (per-wallet signing, secp256k1) inside the TEE; payout delivery is **`outbox`** (idempotent). *(No `loadWasmComponent`, ERC-8004, Hedera, or Stripe — those were unverified and are dropped.)* This mirrors T3N's own `payroll-agent` use case.

## Tech Stack
- **Client/orchestration:** TypeScript + `T3nClient` (`handshake`, `authenticate(createEthAuthInput)`, `executeAndDecode`)
- **Escrow contract:** Rust → WASM (`wasm32-wasip2`), entry `dispatch()` — funding + release-condition logic
- **Key custody + release signing:** `signing` host iface (per-wallet signing, secp256k1) — keys derived/held in the TEE under `cluster CEK`, never exposed to the contract or agent
- **Payout delivery:** `outbox` (post-transaction HTTP with idempotency dedup — no double-pay)
- **Sensitive payment fields:** `http-with-placeholders` (`{{profile.*}}`) so payout details aren't exposed to the agent
- **Identity:** `did:t3n` (`did-registry` / `agent-registry`); **`agent-auth`** scopes the agent to release functions
- **Asset:** Terminal 3 sandbox test tokens
- **Frontend:** Next.js + Tailwind. **Tests:** Vitest

## System Diagram
```mermaid
flowchart LR
    C[Client] -->|fund milestone| ESC
    F[Freelancer] -->|attest: delivered (sig)| ESC
    C -->|attest: approved (sig)| ESC
    subgraph ESC["Escrowa agent (did:t3n)"]
      API[/REST API/]
      CLI[T3nClient.executeAndDecode]
    end
    subgraph T3["T3N TEE (Intel TDX / Wasmtime)"]
      DISP[escrow contract: dispatch]
      COND[release conditions]
      SIGN[signing: per-wallet secp256k1]
      OUT[outbox: idempotent payout]
    end
    API --> CLI -->|execute fn| DISP --> COND
    COND -->|delivered ∧ approved → sign release| SIGN --> OUT -->|tokens → freelancer| TX[(settlement)]
    ESC -. did:t3n .-> REG[did-registry / agent-registry]
    OUT --> DASH[Audit dashboard]
```

## Release pipeline (the core)
1. **Fund** — client locks test tokens against a milestone; contract records amount + conditions.
2. **Attest** — freelancer signs `delivered`, client signs `approved` (each verified against their `did:t3n`).
3. **Evaluate (in TEE contract)** — `delivered ∧ approved` (or deadline/arbiter rule) → conditions met.
4. **Sign & release** — the contract calls **`signing`** to sign the release with a per-wallet key held in the enclave; **`outbox`** delivers the payout idempotently (a retry can't double-pay).
5. **Log** — attestations + TEE proof + settlement reference to the dashboard.

Security claim (T3N's): the release key lives only inside the attested TEE (`cluster CEK`); the agent never holds it, and release requires matching attestations — **no single party can move the funds alone**.

## Data Model
```ts
type Milestone = { id: string; client: string; freelancer: string; amount: number; conditions: ReleaseRule; status: 'funded'|'delivered'|'released'|'refunded' }
type ReleaseRule = { requireDelivered: true; requireApproved: boolean; deadline?: number; arbiter?: string }
type Attestation = { milestoneId: string; by: string; kind: 'delivered'|'approved'; sig: string; ts: number }
type Release = { milestoneId: string; settlementRef: string; teeProof: string; ts: number }
```

## API
| Method | Path | Purpose |
|---|---|---|
| POST | `/milestones` | create + fund a milestone |
| POST | `/milestones/:id/attest` | submit a delivered/approved signature |
| GET | `/milestones/:id` | status + attestations + settlement ref |
| POST | `/milestones/:id/resolve` | trigger deadline/arbiter fallback |

## Model Selection
No ML on the release path — moving money must be deterministic + auditable; release is a pure condition check in the Rust contract, never a model's judgment. Optional Claude Haiku **off-path** to parse a natural-language SOW into structured milestones at setup time.

## Host interfaces used (real, ≥3)
`signing` · `outbox` · `http-with-placeholders` · `did-registry`/`agent-registry` · `agent-auth` (scopes the agent to release functions) · `kv-store` (milestone state).

## Boilerplate
`npx create-next-app` (board) + a Rust contract crate (`wasm32-wasip2`, `wit-bindgen 0.49`) for funding/release logic.
