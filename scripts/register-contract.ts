/**
 * register-contract.ts — register Escrowa's WASM contract on the real Terminal 3 network.
 *
 * STATUS: ready, but gated by the network. Escrowa's release path needs host interfaces
 * (`signing`, `outbox`, `did-registry`, `agent-auth`) that are currently "Coming soon" for
 * tenant contracts (see docs.terminal3.io/t3n/how-t3n-works/host-api and BUGS.md A5), and the
 * contract's WIT must first be migrated to the real `t3n:host/*@0.1.0` imports (BUGS.md A7).
 * This script performs the documented register flow verbatim so it works the moment those land.
 *
 * Prerequisites:
 *   1. npm i @terminal3/t3n-sdk          (already a dependency)
 *   2. T3N_API_KEY = developer key from https://www.terminal3.io/claim-page
 *   3. Build the WASM:
 *        cargo build --manifest-path contract/Cargo.toml --target wasm32-wasip2 --release
 *
 * Run:
 *   make register                       # from repo root (recommended)
 *   # or manually from board/ (NODE_PATH lets scripts/ resolve board's node_modules):
 *   T3N_API_KEY=0x... NODE_PATH="$PWD/node_modules" npx tsx ../scripts/register-contract.ts
 *   # optional: T3N_ENV=production (defaults to testnet)
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  T3nClient,
  TenantClient,
  setEnvironment,
  loadWasmComponent,
  eth_get_address,
  metamask_sign,
  createEthAuthInput,
  getNodeUrl,
} from "@terminal3/t3n-sdk";

const CONTRACT_TAIL = "escrow";
const CONTRACT_VERSION = "0.1.0";
const WASM_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../contract/target/wasm32-wasip2/release/escrow_contract.wasm",
);

async function main() {
  const T3N_API_KEY = process.env.T3N_API_KEY;
  if (!T3N_API_KEY) {
    throw new Error(
      "Set T3N_API_KEY (your developer key from https://www.terminal3.io/claim-page).",
    );
  }

  // The SDK resolves the cluster/node URL for every client from the active environment.
  setEnvironment((process.env.T3N_ENV as "testnet" | "production") || "testnet");

  const wasmComponent = await loadWasmComponent(); // all crypto runs inside this component
  const address = eth_get_address(T3N_API_KEY);

  const t3n = new T3nClient({
    wasmComponent, // no baseUrl — resolved from setEnvironment()
    handlers: { EthSign: metamask_sign(address, undefined, T3N_API_KEY) },
  });

  console.log("→ handshake + authenticate to T3N…");
  await t3n.handshake();
  const did = await t3n.authenticate(createEthAuthInput(address));
  const tenantDid = did.value; // opaque did:t3n:<hex> — read from the session, never derived
  console.log(`  tenant DID: ${tenantDid}`);

  const tenant = new TenantClient({ t3n, baseUrl: getNodeUrl(), tenantDid });

  console.log(`→ reading compiled WASM: ${WASM_PATH}`);
  const wasm = await readFile(WASM_PATH);

  console.log(`→ registering tail="${CONTRACT_TAIL}" v${CONTRACT_VERSION}…`);
  const result = await tenant.contracts.register({
    tail: CONTRACT_TAIL,
    version: CONTRACT_VERSION,
    wasm,
  });

  const tenantId = tenantDid.slice("did:t3n:".length);
  const scriptName = `z:${tenantId}:${CONTRACT_TAIL}`;
  console.log(`\n✅ Registered ${scriptName} as contract_id ${result.contract_id}`);
  console.log(`   Invoke with executeAndDecode({ script_name: "${scriptName}", … })`);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("\n❌ Registration failed:", msg);
  process.exitCode = 1;
});
