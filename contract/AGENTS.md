# 🔒 Escrowa TEE Contract — Agent Instructions

## Architecture
This is a WebAssembly (WASM) smart contract designed to run inside a Terminal 3 Secure TEE (Trusted Execution Environment) Sandbox. It acts as an escrow manager for milestones, utilizing a host WebAssembly Interface Type (WIT) for persistent state and secure operations.

## Tech Stack
- **Language:** Rust (Edition 2021)
- **Target:** WASM Component (`cdylib`)
- **Key Dependencies:** `serde`, `serde_json`, `wit-bindgen`

## Core Concepts
- **Host Functions:** All external side-effects (database, signing, network) MUST use the imported WIT functions from `crate::t3n::escrow::host`.
- **Key-Value Store:** State is persisted using `host::kv_get` and `host::kv_set`.
- **Enclave Signing:** Private keys never touch this code. We use `host::sign_secp256k1` to request the TEE to sign transaction hashes securely.
- **Outbox Pattern:** Funds are not held directly in WASM memory. The contract uses `host::outbox_post` to idempotently instruct an external vault/API (`api.terminal3.io`) to release or refund T3 tokens.

## Coding Rules
1. **No External Network/Filesystem Crates:** Standard `std::fs` or networking crates like `reqwest` are forbidden. Use the host WIT bindings.
2. **Deterministic Execution:** The TEE relies on deterministic outcomes. Avoid using actual randomness or time sources unless provided explicitly by the host via WIT.
3. **JSON Serialization:** State is serialized to JSON strings before being saved to the KV store. Always gracefully handle deserialization errors.
