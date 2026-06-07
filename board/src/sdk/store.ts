import { Redis } from "@upstash/redis";
import { exportStore, importStore } from "@/wasm/host";
import { T3nClient, Milestone } from "./T3nClient";

// Durable shared state for serverless (Vercel KV / Upstash Redis).
//
// The WASM host functions are SYNCHRONOUS, so we can't await Redis inside them.
// Instead we hydrate the in-memory KV from Redis at the START of each API request
// and flush it back at the END — keeping contract execution unchanged. When no KV
// is configured (local dev / tests) these are no-ops and the in-memory store is used.

const STORE_KEY = "escrowa:kvstore";

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function milestonesFromStore(store: Record<string, string>): Milestone[] {
  const out: Milestone[] = [];
  for (const [key, value] of Object.entries(store)) {
    if (key.startsWith("milestones:")) {
      try {
        out.push(JSON.parse(value));
      } catch {
        // skip malformed entries
      }
    }
  }
  return out;
}

/** Load durable state into the in-memory KV + UI cache. Call at request start. */
export async function hydrate(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const data = await redis.get<Record<string, string>>(STORE_KEY);
  if (!data) return;
  importStore(data);
  T3nClient.hydrateCacheFrom(milestonesFromStore(data));
}

/** Persist the in-memory KV to the durable store. Call at request end. */
export async function persist(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(STORE_KEY, exportStore());
}
