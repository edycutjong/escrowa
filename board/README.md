# 🔒 Escrowa

**Terminal 3 Agent Dev Kit Bounty Challenge — Secure TEE Sandbox Node**

Escrowa is a fully-featured milestone escrow platform powered by Trusted Execution Environments (TEEs). It allows clients and freelancers to securely lock T3 tokens in an off-chain hardware enclave. Funds are only released when strict cryptographic conditions are met via dual-attestation, deadline triggers, or authorized arbiters.

## 🚀 Features
- **TEE-Secured Vaults:** Funds are conceptually locked in a Secure TEE Sandbox.
- **Dual-Attestation Flow:** Requires signed proofs from both the Freelancer (Delivery) and Client (Approval) before the enclave settles the transaction.
- **Arbiter & Deadline Fallbacks:** Built-in escalation paths for dispute resolution and time-gated refunds.
- **Execution Proofs:** Generates simulated cryptographic TEE proofs and outbox settlement references upon success.
- **Agent Dev Kit:** Built on the `did:t3n` DID standard for the Terminal 3 ecosystem.

## 🛠 Tech Stack
- **Framework:** Next.js 16 (App Router)
- **UI/Styling:** React 19, Tailwind CSS v4
- **Testing:** Vitest

## 🏃‍♂️ Getting Started

First, install the dependencies:
```bash
npm install
```

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the interactive dashboard.

## 🧪 Seeding the Dashboard
To test the various escrow states, click the **"Reset & Seed Scenarios"** button in the top right of the dashboard. This will populate the UI with:
- A standard active milestone
- A deadline-gated milestone
- An arbiter-gated milestone
- Previously settled milestones

## 📜 Agent Instructions
If you are an AI agent contributing to this project, please read the [AGENTS.md](./AGENTS.md) file for strict rules regarding Next.js 16 breaking changes, state management, and aesthetic guidelines.
