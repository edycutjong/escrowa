# 🎬 Demo Guide — Escrowa

Welcome to **Escrowa**! This guide walks you through the deterministic scenarios built to prove the stability and capabilities of our TEE-secured autonomous escrow agent.

---

## 🚀 How to Run the Demo

### 1. Start the Local Server
From the `board/` directory:
```bash
npm run dev
```
Open your browser to `http://localhost:3000`.

### 2. Run the Seed Script
Click the **"Reset & Seed Scenarios"** button in the dashboard header. This executes the database seeding via the `/api/seed` endpoint and resets all milestones to their starting demo states.

---

## 💡 Seeded Scenarios

| Milestone | Amount | Flow | Execution Path | Expected Outcome |
|---|---|---|---|---|
| **`m1-happy`** | 4,200 T3 | Priya delivers → Client approves | **Dual Attestation** | **Release** payment to Priya (generates real settlement tx reference) |
| **`m2-ghost`** | 1,000 T3 | Priya delivers → Client ghosts | **Deadline Fallback** | **Auto-release** via pre-configured deadline rule |
| **`m3-dispute`** | 2,500 T3 | Priya delivers → Client rejects | **Arbiter Decision** | **Arbiter Refund** (sends tokens back to client) or Release |
| **`m4-unfunded`** | 800 T3 | Attest attempted before funding | **Precondition Guard** | **Rejected** (cannot attest to unfunded milestone) |

### 🎥 The "Wow" Money Shot
To see the core capability-unlock:
1. Select **`m1-happy`** in the dashboard.
2. Click **"Approve Payment"** (representing the client's signature).
3. The fullscreen **ReleaseVault Takeover** will trigger immediately, displaying:
   * Real-time cryptographic validation of both attestations.
   * Secure signature generation inside the TEE using the `signing` host API.
   * Idempotent payout settlement reference generated via the `outbox`.
   * **Settlement reference:** `tx_0x...` shown on screen.

---

## 🧪 Verifying the Security Claims

### Enclave Key Custody Test
We built a unit test that verifies the enclave's security guarantee (keys never leak outside the TDX VM). Run it with:
```bash
npm run test
```
The test asserts that the generated keys never enter the Node process environment, log outputs, or global variables.

---

## ⚡ Latency Benchmarks
Run the latency benchmarks over 200 release condition evaluations inside the enclave:
```bash
./scripts/bench.py
```
This will run the Rust contract dispatch evaluations and output the Mean, p50, and p95 latency.
