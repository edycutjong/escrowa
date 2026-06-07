/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { ethers } from "ethers";


// In-memory KV store for the WASM contract
// Use globalThis to persist the map across Next.js module reloading boundaries
const kvStore = (globalThis as any).__kvStore || new Map<string, string>();
if (!(globalThis as any).__kvStore) {
  (globalThis as any).__kvStore = kvStore;
}

export function kvGet(namespace: string, key: string): string {
  const fullKey = `${namespace}:${key}`;
  if (kvStore.has(fullKey)) {
    return kvStore.get(fullKey)!;
  }
  throw "Key not found"; // Returning string triggers result::err in jco
}

export function kvSet(namespace: string, key: string, value: string): string {
  const fullKey = `${namespace}:${key}`;
  kvStore.set(fullKey, value);
  return value;
}

export function signSecp256k1(walletAddress: string, messageHash: string): string {
  // In a real TEE, this uses the hardware-protected key for the wallet.
  // Here, we'll derive a deterministic mock private key from the wallet address to simulate it.
  try {
    const hash = ethers.id(walletAddress); // SHA256 of wallet address
    const wallet = new ethers.Wallet(hash);
    const signature = wallet.signMessageSync(messageHash);
    return signature;
  } catch (e: any) {
    throw `Signing error: ${e.message}`;
  }
}

export function issueSdJwt(claimsJson: string): string {
  return "sd_jwt_mock";
}

export function outboxPost(url: string, body: string, idempotencyKey: string): string {
  // Simulates a post to the outbox. Returns a mocked settlement response.
  const parsed = JSON.parse(body);
  const sig = parsed.signature || "";
  const milestoneId = parsed.milestoneId || "";
  
  // Create deterministic settlement ref for tests
  const settlementRef = `tx_0x${ethers.id(body + idempotencyKey).substring(2, 10)}`;
  const teeProof = parsed.action === "refund" ? `tee_proof_refund_${milestoneId}` : `tee_proof_${milestoneId}`;
  
  return JSON.stringify({
    settlementRef,
    teeProof
  });
}

export function httpPostPlaceholder(url: string, templateBody: string, userDid: string): string {
  return "http_post_mock";
}

export function clearStore() {
  kvStore.clear();
}

// Snapshot the in-memory KV store (for persisting to a durable store between requests).
export function exportStore(): Record<string, string> {
  return Object.fromEntries(kvStore.entries());
}

// Replace the in-memory KV store from a snapshot (hydrate at request start).
export function importStore(entries: Record<string, string>): void {
  kvStore.clear();
  for (const [k, v] of Object.entries(entries)) {
    kvStore.set(k, v);
  }
}
