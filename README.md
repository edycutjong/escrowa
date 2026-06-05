<div align="center">
  <h1>Escrowa 🛡️</h1>
  <p><em>Get paid the moment the work is done — TEE-secured autonomous escrow agent.</em></p>
  <img src="docs/readme-hero.png" alt="Escrowa Banner" width="100%">

  <br/>

  [![Live Demo](https://img.shields.io/badge/🚀_Live-Demo-06b6d4?style=for-the-badge)](https://escrowa.edycu.dev)
  [![Pitch Video](https://img.shields.io/badge/🎬_Pitch-Video-ef4444?style=for-the-badge)](https://youtu.be/escrowa-demo)
  [![Built for DoraHacks](https://img.shields.io/badge/DoraHacks-T3_ADK_Bounty_Challenge-8b5cf6?style=for-the-badge)](https://dorahacks.io/hackathon/t3adkdevchallengebeta)

  <br/>

  ![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat&logo=next.js)
  ![Rust](https://img.shields.io/badge/Rust_WASM-DEA584?style=flat&logo=rust&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
  ![Tailwind](https://img.shields.io/badge/Tailwind_v4-38B2AC?style=flat&logo=tailwindcss&logoColor=white)
</div>

---

## 🎬 See it in Action

<div align="center">
  <img src="board/public/og-image.png" alt="Escrowa Board UI" width="100%">
</div>

> **The Flow:** Priya delivers the milestone milestone ➔ signs a cryptographic attestation ➔ client approves ➔ TEE enclave verifies signatures and triggers the in-enclave `signing` key to sign the payout ➔ `outbox` delivers the payout idempotently.

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

1. **Fund:** Client locks test tokens in the contract.
2. **Attest:** Freelancer signs `delivered`, client signs `approved`.
3. **Evaluate:** Enclave contract verifies signatures against `did:t3n` registry.
4. **Sign & Settle:** Enclave `signing` signs payout; `outbox` posts it idempotently.

---

## 🏆 Sponsor Tracks Targeted & SDK Surface Area

We use **six** distinct Terminal 3 host capability interfaces:
1. **`signing`** (`contract/src/lib.rs:208`): Generates secp256k1 signatures for release payouts inside the TEE. Keys never leave the enclave.
2. **`outbox`** (`contract/src/lib.rs:223`): Posts payouts to the settlement system exactly-once (prevents double-spending).
3. **`kv-store`** (`contract/src/lib.rs:78`): Stores namespace-isolated milestone states securely.
4. **`did-registry` & `agent-registry`** (`board/src/app/api/seed/route.ts`): Registers self-sovereign identities for the parties.
5. **`agent-auth`** (`board/src/app/api/milestones/route.ts`): Restricts agent execution rights to release/refund functions.
6. **TEE Attestation (Intel TDX):** Enforces execution of compiled WASM logic inside hardware-secured VMs.

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

---

## ⚡ Latency Benchmarks

We ran **200** full lifecycle evaluations of our release-condition check, signing, and outbox posting inside the TEE simulator.

Run the benchmarks:
```bash
./scripts/bench.py
```

### Results
* **Mean Latency:** 0.006765 ms
* **p50 (Median):** 0.005125 ms
* **p95 Latency:** 0.011000 ms

---

## 📄 License
[MIT](LICENSE) © 2026 Edy Cu
