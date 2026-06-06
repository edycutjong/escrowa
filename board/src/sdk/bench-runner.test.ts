/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";

describe("Benchmark Runner Script (bench-runner.ts)", () => {
  it("imports and executes bench-runner.ts", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async () => {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });
    const bench = await import("./bench-runner");
    expect(bench).toBeDefined();
    await new Promise((resolve) => setTimeout(resolve, 150));
  });

  it("imports and executes bench-runner.ts in non-test mode", async () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = "bench";
    process.env.BENCH_RUNS = "2";
    
    vi.spyOn(global, "fetch").mockImplementation(async () => {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });
    vi.resetModules();
    const bench = await import("./bench-runner");
    expect(bench).toBeDefined();
    await new Promise((resolve) => setTimeout(resolve, 150));
    
    (process.env as any).NODE_ENV = originalEnv;
    delete process.env.BENCH_RUNS;
  });

  it("imports and executes bench-runner.ts in non-test mode with default runs", async () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = "bench";
    delete process.env.BENCH_RUNS;
    
    vi.spyOn(global, "fetch").mockImplementation(async () => {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });
    vi.resetModules();
    const bench = await import("./bench-runner");
    expect(bench).toBeDefined();
    await new Promise((resolve) => setTimeout(resolve, 150));
    
    (process.env as any).NODE_ENV = originalEnv;
  });
});
