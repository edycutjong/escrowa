## 👩‍⚖️ For Judges (start here)

> **What it is:** A `did:t3n` autonomous escrow agent. A client funds a milestone, then both freelancer and client sign cryptographic attestations. When both match (or a deadline/arbiter rule fires), a Rust ➔ WASM contract automatically releases the payout. No single party—not even Escrowa itself—can move the funds unilaterally.

### 🔗 Quick Links
- 🎬 **Demo Video:** [youtu.be/WzEVJwG1ebQ](https://youtu.be/WzEVJwG1ebQ)
- 🚀 **Live Demo Console:** [escrowa.edycu.dev](https://escrowa.edycu.dev)
- 🏆 **DoraHacks BUIDL Page:** [dorahacks.io/buidl/44352](https://dorahacks.io/buidl/44352)

### 🎯 Bounty Tracks Targeted
- 🥇 **Best Agent Auth SDK ($300)** (Primary): A production-ready least-privilege `agent-auth` implementation.
- 🐞 **Bug & Documentation Bounty ($200)**: Real ADK developer feedback detailed in [BUGS.md](file:///Users/edycu/Projects/Hackathon/dorahacks-t3adk-escrowa/BUGS.md).

### ⚡ Verify in ~60 Seconds
```bash
cd contract && cargo test          # Run 18 Rust contract state tests
cd ../board && npm run ci          # Run ESLint, typecheck & 73 Vitest tests (100% coverage)
npm run e2e                        # Run 10 Playwright E2E tests (auto-starts dev server)
npm run dev                        # Launch local dev server at http://localhost:3000
```

### 🔍 Where the Substance Is
| Core Concern | Technical Implementation / File Reference |
|---|---|
| **Agent-Auth Enforcement** | Scoped functions + `allowedHosts` allowlist configured in [agentAuth.ts](file:///Users/edycu/Projects/Hackathon/dorahacks-t3adk-escrowa/board/src/sdk/agentAuth.ts) and enforced natively via [T3nClient.ts](file:///Users/edycu/Projects/Hackathon/dorahacks-t3adk-escrowa/board/src/sdk/T3nClient.ts) |
| **Escrow State Machine** | Core dual-consent, deadline, and arbiter logic written in Rust in [lib.rs](file:///Users/edycu/Projects/Hackathon/dorahacks-t3adk-escrowa/contract/src/lib.rs) |
| **Decentralized Identity** | Identity resolution and mapping configured in [didRegistry.ts](file:///Users/edycu/Projects/Hackathon/dorahacks-t3adk-escrowa/board/src/sdk/didRegistry.ts) |
| **Comprehensive Test Suite** | 91 total tests (73 Vitest frontend tests + 18 Cargo contract tests) |
| **Documentation & Playbook** | Walkthrough playbook in [DEMO.md](file:///Users/edycu/Projects/Hackathon/dorahacks-t3adk-escrowa/docs/DEMO.md) and architecture layout in [ARCHITECTURE.md](file:///Users/edycu/Projects/Hackathon/dorahacks-t3adk-escrowa/docs/ARCHITECTURE.md) |

> [!IMPORTANT]
> **Honest Hackathon Scope & Simulation Context:** The Rust ➔ WASM contract logic and secp256k1 cryptographic signatures are **real**. The TEE enclave, host interfaces, and blockchain settlement are **locally simulated** using the T3 Agent Development Kit (ADK) and `@bytecodealliance/jco`. This architecture is production-ready for real Intel TDX hardware when the T3N mainnet launches. Full details are in the *Hackathon Simulation Context* section below.

---

<div align="center">
  <img src="board/public/icon.svg" alt="Escrowa" width="120" height="120">

  <h1>Escrowa 🔲</h1>
  <p><em>Get paid the moment the work is done — TEE-secured autonomous escrow agent.</em></p>
  <img src="docs/readme-hero.png" alt="Escrowa Banner" width="100%">

  <br/>

  [![Live Demo](https://img.shields.io/badge/🚀_Live-Demo-06b6d4?style=for-the-badge)](https://escrowa.edycu.dev)
  [![Pitch Video](https://img.shields.io/badge/🎬_Pitch-Video-ef4444?style=for-the-badge)](https://youtu.be/WzEVJwG1ebQ)
  [![Built for DoraHacks](https://img.shields.io/badge/DoraHacks-T3_ADK_Bounty_Challenge-8b5cf6?style=for-the-badge)](https://dorahacks.io/hackathon/t3adkdevchallengebeta)
  [![DoraHacks BUIDL](https://img.shields.io/badge/DoraHacks-View_BUIDL_%2344352-a855f7?style=for-the-badge)](https://dorahacks.io/buidl/44352)

  <br/>

  ![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat&logo=next.js)
  ![Rust](https://img.shields.io/badge/Rust_WASM-DEA584?style=flat&logo=rust&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
  ![Tailwind](https://img.shields.io/badge/Tailwind_v4-38B2AC?style=flat&logo=tailwindcss&logoColor=white)
  [![CI](https://github.com/edycutjong/escrowa/actions/workflows/ci.yml/badge.svg)](https://github.com/edycutjong/escrowa/actions/workflows/ci.yml)
</div>

---

## 🎬 See it in Action

<div align="center">
  <img src="board/public/og-image.png" alt="Escrowa Board UI" width="100%">
</div>

> **The Flow:** Priya delivers the milestone ➔ signs a cryptographic attestation ➔ client approves ➔ TEE enclave verifies signatures and triggers the in-enclave `signing` key to sign the payout ➔ `outbox` delivers the payout idempotently.

### The three control paths

| ✅ Mutual release (`m1`) | ⏰ Deadline fallback (`m2`) | ⚖️ Arbiter refund (`m3`) |
|:---:|:---:|:---:|
| <img alt="m1 mutual release" src="https://github.com/user-attachments/assets/f89d8b12-63a3-46a4-9729-226f35b82bbc" width="100%"> | <img alt="m2 deadline release" src="https://github.com/user-attachments/assets/17075b7d-2b56-484c-aab8-6c70d34084cf" width="100%"> | <img alt="m3 arbiter refund" src="https://github.com/user-attachments/assets/677db0d8-f13c-40c6-8b48-36b3a7710954" width="100%"> |
| Both parties attest → **released** | Client ghosts → **auto-release** at deadline | Disputed → arbiter **refunds** the client |

---

## 💡 The Problem & Solution

### The Problem
Priya shipped the final milestone of a 6-week remote development contract. The client said "looks great," went silent, and she's still chasing $4,200 three months later. Traditional escrow requires trusting a third-party custodian with both the funds and the release decision. On-chain escrow usually means trusting a hot wallet or an opaque, unverified smart contract. No platform offers a neutral, secure environment that releases payment **only** when both sides agree without exposing the private keys to any single human or software agent.

### The Solution
**Escrowa** is an autonomous escrow agent. The funds are locked under conditional logic compiled for a **Trusted Execution Environment (TEE)**.
* **Mutual Consent:** Payout occurs automatically when the freelancer's "delivered" and the client's "approved" cryptographic signatures match.
* **Hardware-Gated Custody:** The signing keys are generated and held **inside the enclave** under `cluster CEK`. The agent never sees the raw private keys, preventing unilateral draining of the escrow.
* **Fail-Safe Fallbacks:** Includes customizable ghost/deadline rules (automatic release if a client vanishes) and arbiter-gated resolution paths.

> [!NOTE]
> **Hackathon Simulation Context:** For this DoraHacks submission, the TEE hardware environment is simulated locally using the T3 Agent Development Kit (ADK) and `@bytecodealliance/jco`. The core logic (`contract/src/lib.rs`) compiles to a standard `wasm32-wasip2` T3 component, but the host cryptographic functions (like `sign-secp256k1`) are simulated locally via `ethers.js` in `board/src/wasm/host.ts`. This ensures the code is production-ready for real Intel TDX hardware when the T3 network launches, without misleading about current hardware utilization.

---

## 🏗️ Architecture & Flow

```mermaid
flowchart LR
    C[Client] -->|"fund milestone"| ESC
    F[Freelancer] -->|"attest: delivered (sig)"| ESC
    C -->|"attest: approved (sig)"| ESC
    subgraph ESC["Escrowa agent (did:t3n)"]
      API["REST API"]
      CLI["T3nClient.executeAndDecode"]
    end
    subgraph T3["T3N TEE (Intel TDX / Wasmtime)"]
      DISP["escrow contract: dispatch"]
      COND["release conditions"]
      SIGN["signing: per-wallet secp256k1"]
      OUT["outbox: idempotent payout"]
    end
    API --> CLI -->|"execute fn"| DISP --> COND
    COND -->|"delivered AND approved -> sign release"| SIGN --> OUT -->|"tokens -> freelancer"| TX[("settlement")]
    ESC -. "did:t3n" .-> REG["did-registry / agent-registry"]
    OUT --> DASH["Audit dashboard"]
```

1. **Fund:** Client locks test tokens in the contract.
2. **Attest:** Freelancer signs `delivered`, client signs `approved`.
3. **Evaluate:** Enclave contract verifies signatures against `did:t3n` registry.
4. **Sign & Settle:** Enclave `signing` signs payout; `outbox` posts it idempotently.

---

## 🏆 Sponsor Tracks Targeted & SDK Surface Area

We use **six** distinct Terminal 3 host capability interfaces:
1. **`signing`** (`contract/src/lib.rs:224`): Generates secp256k1 signatures for release payouts inside the TEE. Keys never leave the enclave.
2. **`outbox`** (`contract/src/lib.rs:239`): Posts payouts to the settlement system exactly-once (prevents double-spending).
3. **`kv-store`** (`contract/src/lib.rs:83`): Stores namespace-isolated milestone states securely.
4. **`did-registry` & `agent-registry`** (`board/src/sdk/didRegistry.ts`, wired in `board/src/app/api/seed/route.ts`): Links each party's authenticator to its `did:t3n` identity and publishes the Escrowa agent URI.
5. **`agent-auth`** (`board/src/sdk/agentAuth.ts`, enforced in `board/src/sdk/T3nClient.ts`): Provisions Escrowa a **least-privilege scope** (allowed functions + `allowedHosts` egress allowlist) and the host blocks any call outside it — an out-of-scope function fails with `host/agent.function_denied` and an unauthorized host with `host/http.egress_denied`.
6. **TEE Attestation (Intel TDX):** Enforces execution of compiled WASM logic inside hardware-secured VMs.

---

## 🪪 Identities (did:t3n)

The demo provisions these identities via the `did-registry` / `agent-registry` (see `board/src/app/api/seed/route.ts`). DIDs are `did:t3n:<authenticator-address>`.

| Role | Authenticator address | DID |
|---|---|---|
| **Client** | `0x1111111111111111111111111111111111111111` | `did:t3n:0x1111111111111111111111111111111111111111` |
| **Freelancer** (Priya) | `0x2222222222222222222222222222222222222222` | `did:t3n:0x2222222222222222222222222222222222222222` |
| **Arbiter** | `0x3333333333333333333333333333333333333333` | `did:t3n:0x3333333333333333333333333333333333333333` |
| **Escrowa agent** | — | `did:t3n:escrowa-agent` (URI `https://escrowa.edycu.dev/.well-known/agent`) |

The Escrowa agent is granted a least-privilege `agent-auth` scope: functions `create-milestone`, `submit-attestation`, `resolve-milestone`; egress allowlist `api.terminal3.io` (see `board/src/sdk/agentAuth.ts`).

> These are deterministic demo identities for the simulated build. A real deployment would obtain its `did:t3n` and developer key from the [claim page](https://www.terminal3.io/claim-page) (set as `T3N_API_KEY`).

---

## 🚀 Getting Started

### Prerequisites
* Node.js ≥ 20
* Rust & Cargo (with `wasm32-wasip2` target)
* npm

### Setup & Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/edycutjong/escrowa.git
   cd escrowa
   ```
2. Build the Rust WASM contract:
   ```bash
   cd contract
   rustup target add wasm32-wasip2
   cargo build --target wasm32-wasip2 --release
   cd ..
   ```
3. Install frontend dependencies:
   ```bash
   cd board
   npm install
   ```
4. Configure the Environment Variables:
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and add your Terminal 3 API Token (claimable [here](https://www.terminal3.io/claim-page)):
   ```env
   T3_API_KEY=0x_your_terminal3_api_key_here
   ```
5. Run the local dev server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to view the Escrowa Dashboard.

---

## 🧪 Testing & Verification

We enforce a rigorous test harness verifying the entire escrow state machine.

```bash
# Run unit tests
cd board
npm run test
```

| Suite | Focus | Status |
|---|---|---|
| **Key Custody Test** | Asserts that generated keys are restricted to TEE memory and never leak to disk/env/logs | ✅ Passing |
| **Happy Path Suite** | Verifies `create` -> `attest:delivered` -> `attest:approved` -> `released` | ✅ Passing |
| **Deadline Fallback** | Verifies deadline timeout automatically triggers release/refund | ✅ Passing |
| **Arbiter Dispute** | Verifies arbiter-only decision resolution | ✅ Passing |
| **Replay Protection** | Asserts duplicate attestation requests are rejected | ✅ Passing |
| **Agent-Auth Scope** | Asserts out-of-scope functions (`host/agent.function_denied`) and non-allowlisted egress (`host/http.egress_denied`) are blocked | ✅ Passing |

---

## ⚡ Latency Benchmarks

We ran **200** full lifecycle evaluations of our release-condition check, signing, and outbox posting inside the TEE simulator.

Run the benchmarks:
```bash
./scripts/bench.py
```

### Results (200 full-lifecycle evals; varies run to run)
* **Mean Latency:** ~3.4 ms
* **p50 (Median):** ~2.3 ms
* **p95 Latency:** ~8.6 ms

---

## 📄 License
[MIT](LICENSE) © 2026 Edy Cu
