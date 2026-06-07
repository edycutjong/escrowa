import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { hydrate, persist } from "./store";
import { kvSet, kvGet, clearStore, exportStore } from "../wasm/host";
import { T3nClient } from "./T3nClient";

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock("@upstash/redis", () => ({
  Redis: class {
    get = redisMock.get;
    set = redisMock.set;
  },
}));

const ENV = { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "tok" };

describe("durable store (store.ts)", () => {
  beforeEach(() => {
    clearStore();
    T3nClient.clearStore();
    redisMock.get.mockReset();
    redisMock.set.mockReset();
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });
  afterEach(() => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  it("is a no-op when no KV is configured", async () => {
    await hydrate();
    await persist();
    expect(redisMock.get).not.toHaveBeenCalled();
    expect(redisMock.set).not.toHaveBeenCalled();
  });

  it("persist() writes the in-memory store snapshot to Redis when configured", async () => {
    Object.assign(process.env, ENV);
    kvSet("milestones", "m1", JSON.stringify({ id: "m1", amount: 100 }));
    await persist();
    expect(redisMock.set).toHaveBeenCalledTimes(1);
    const [, blob] = redisMock.set.mock.calls[0];
    expect(blob).toEqual(exportStore());
    expect(blob["milestones:m1"]).toContain("m1");
  });

  it("hydrate() loads Redis state into the in-memory store + UI cache", async () => {
    Object.assign(process.env, ENV);
    redisMock.get.mockResolvedValue({
      "milestones:m1": JSON.stringify({ id: "m1", amount: 4200, status: "funded" }),
      "milestones:bad": "not-json",       // malformed → skipped
      "secrets:k": "v",                    // non-milestone key → not a milestone
    });

    await hydrate();

    // in-memory KV repopulated
    expect(kvGet("milestones", "m1")).toContain("4200");
    expect(kvGet("secrets", "k")).toBe("v");
    // UI cache rebuilt with only the valid milestone
    const ms = T3nClient.getAllMilestones();
    expect(ms.map(m => m.id)).toEqual(["m1"]);
  });

  it("hydrate() is a no-op when Redis has no snapshot yet", async () => {
    Object.assign(process.env, ENV);
    redisMock.get.mockResolvedValue(null);
    await hydrate();
    expect(T3nClient.getAllMilestones()).toEqual([]);
  });

  it("reads UPSTASH_* env vars as a fallback", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://up.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "tok2";
    redisMock.get.mockResolvedValue(null);
    await hydrate();
    expect(redisMock.get).toHaveBeenCalledTimes(1);
  });
});
