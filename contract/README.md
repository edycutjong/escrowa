# 🔒 Escrowa TEE Contract

**Terminal 3 Agent Dev Kit Bounty Challenge**

This repository contains the Rust WebAssembly (WASM) contract that powers the **Escrowa** milestone escrow system. Instead of running on a public blockchain like Ethereum, this contract runs inside a **Terminal 3 Secure TEE Sandbox Node**, providing privacy, scalability, and secure off-chain signing.

## 🏗 Architecture

The contract uses `wit-bindgen` to communicate with the TEE host environment. The host provides three critical capabilities that make this escrow secure:
1. **Persistent KV Storage:** (`kv_get`, `kv_set`) for storing milestone state between invocations.
2. **Secure Enclave Signing:** (`sign_secp256k1`) allowing the contract to authorize payouts without ever seeing the private key.
3. **Idempotent Outbox:** (`outbox_post`) reliably sending HTTP payloads to the Terminal 3 API to settle funds via a custodial vault.

## 📜 Escrow Flow

1. **Create:** A milestone is created with a Client DID, Freelancer DID, and Amount. It is marked as `funded`.
2. **Attest:** The Freelancer submits a "delivered" attestation. The Client submits an "approved" attestation.
3. **Release:** Once conditions are met, the contract requests a signature from the TEE and pushes an outbox payload to `api.terminal3.io/v1/payouts`.
4. **Dispute/Fallback:** Arbiter DIDs or Deadlines can be used to forcefully release or refund tokens if the standard flow is blocked.

## 🛠 Building the Contract

Ensure you have Rust and the appropriate WASM target installed:
```bash
rustup target add wasm32-unknown-unknown
# or wasm32-wasi depending on your T3 host setup

cargo build --target wasm32-unknown-unknown --release
```

## 🤖 Agent Rules
If you are an AI contributing to this directory, please review [AGENTS.md](./AGENTS.md) and [CLAUDE.md](./CLAUDE.md) for strict WASM compilation and TEE security guidelines.
